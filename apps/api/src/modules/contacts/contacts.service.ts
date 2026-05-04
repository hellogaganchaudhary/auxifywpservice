import { BadRequestException, Injectable } from "@nestjs/common";
import { parse } from "csv-parse/sync";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateContactDto, UpdateContactDto } from "./contacts.dto";
import type { Express } from "express";

type CsvPreviewResult = {
  columns: string[];
  sample: Array<Record<string, string>>;
  totalRows: number;
};

const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, q?: string) {
    return this.prisma.contact.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: q
          ? [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async metadata(organizationId: string) {
    const [segments, customFields, contacts] = await Promise.all([
      this.prisma.contactSegment.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.contactCustomField.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.contact.findMany({
        where: { organizationId, deletedAt: null },
        select: { tags: true, segments: true },
      }),
    ]);

    return {
      segments,
      customFields,
      tags: Array.from(new Set(contacts.flatMap((contact) => contact.tags || []))).sort(),
    };
  }

  async create(organizationId: string, payload: CreateContactDto) {
    if (!organizationId) {
      throw new BadRequestException("Organization required");
    }
    return this.prisma.contact.create({
      data: {
        organizationId,
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        tags: payload.tags || [],
        segments: payload.segments || [],
        customFields: toJsonValue(payload.customFields || {}),
      },
    });
  }

  async get(organizationId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!contact) {
      throw new BadRequestException("Contact not found");
    }
    return contact;
  }

  async update(organizationId: string, id: string, payload: UpdateContactDto) {
    await this.get(organizationId, id);
    const data = {
      ...payload,
      customFields:
        payload.customFields === undefined ? undefined : toJsonValue(payload.customFields),
    };
    return this.prisma.contact.update({
      where: { id },
      data,
    });
  }

  async remove(organizationId: string, id: string) {
    await this.get(organizationId, id);
    return this.prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async conversations(organizationId: string, id: string) {
    await this.get(organizationId, id);
    return this.prisma.conversation.findMany({
      where: { organizationId, contactId: id },
      orderBy: { createdAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  async importCsv(organizationId: string, file?: Express.Multer.File) {
    if (!organizationId) {
      throw new BadRequestException("Organization required");
    }
    if (!file?.buffer) {
      throw new BadRequestException("CSV file required");
    }

    const records: Array<Record<string, string>> = parse(file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const created: string[] = [];
    const skipped: string[] = [];

    for (const row of records) {
      const name = row.name || row.full_name || row.fullName;
      const phone = row.phone || row.mobile || row.phone_number;
      const email = row.email || row.email_address;
      if (!name || !phone) {
        skipped.push(phone || name || "unknown");
        continue;
      }

      await this.prisma.contact.upsert({
        where: { organizationId_phone: { organizationId, phone } },
        update: {
          name,
          email: email || undefined,
        },
        create: {
          organizationId,
          name,
          phone,
          email: email || undefined,
          tags: [],
          segments: [],
          customFields: toJsonValue({}),
        },
      });
      created.push(phone);
    }

    return { created: created.length, skipped: skipped.length };
  }

  async importCsvWithMapping(
    organizationId: string,
    mapping: Record<string, string>,
    file?: Express.Multer.File
  ) {
    if (!file?.buffer) {
      throw new BadRequestException("CSV file required");
    }

    const records: Array<Record<string, string>> = parse(file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (!mapping.name || !mapping.phone) {
      throw new BadRequestException("Name and phone mapping required");
    }

    const firstRow = records[0] || {};
    if (!(mapping.name in firstRow) || !(mapping.phone in firstRow)) {
      throw new BadRequestException("Mapped CSV columns not found");
    }

    let created = 0;
    let skipped = 0;

    for (const row of records) {
      const mappedName = row[mapping.name] || row.name;
      const mappedPhone = row[mapping.phone] || row.phone;
      const mappedEmail = row[mapping.email] || row.email;
      const mappedTags = (row[mapping.tags] || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const mappedSegments = (row[mapping.segments] || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (!mappedName || !mappedPhone) {
        skipped += 1;
        continue;
      }

      await this.prisma.contact.upsert({
        where: { organizationId_phone: { organizationId, phone: mappedPhone } },
        update: {
          name: mappedName,
          email: mappedEmail || undefined,
          tags: mappedTags,
          segments: mappedSegments,
        },
        create: {
          organizationId,
          name: mappedName,
          phone: mappedPhone,
          email: mappedEmail || undefined,
          tags: mappedTags,
          segments: mappedSegments,
          customFields: toJsonValue({}),
        },
      });
      created += 1;
    }

    return { created, skipped };
  }

  async previewCsv(file?: Express.Multer.File): Promise<CsvPreviewResult> {
    if (!file?.buffer) {
      throw new BadRequestException("CSV file required");
    }
    const records: Array<Record<string, string>> = parse(file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    return {
      columns: Object.keys(records[0] || {}),
      sample: records.slice(0, 5),
      totalRows: records.length,
    };
  }

  async createSegment(
    organizationId: string,
    payload: { name: string; color?: string }
  ) {
    return this.prisma.contactSegment.create({
      data: {
        organizationId,
        name: payload.name,
        color: payload.color || "blue",
      },
    });
  }

  async createCustomField(
    organizationId: string,
    payload: { key: string; label: string; type: string; options?: unknown }
  ) {
    return this.prisma.contactCustomField.create({
      data: {
        organizationId,
        key: payload.key,
        label: payload.label,
        type: payload.type,
        options: payload.options === undefined ? undefined : toJsonValue(payload.options),
      },
    });
  }

  async bulkUpdate(
    organizationId: string,
    payload: { contactIds: string[]; tags?: string[]; segments?: string[] }
  ) {
    const contacts = await this.prisma.contact.findMany({
      where: {
        organizationId,
        id: { in: payload.contactIds },
        deletedAt: null,
      },
    });

    await Promise.all(
      contacts.map((contact) =>
        this.prisma.contact.update({
          where: { id: contact.id },
          data: {
            tags: payload.tags
              ? Array.from(new Set([...(contact.tags || []), ...payload.tags]))
              : contact.tags,
            segments: payload.segments
              ? Array.from(new Set([...(contact.segments || []), ...payload.segments]))
              : contact.segments,
          },
        })
      )
    );

    return { updated: contacts.length };
  }
}
