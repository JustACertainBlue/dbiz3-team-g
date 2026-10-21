import { NextResponse } from "next/server";
import { registrationSchema } from "@/lib/validation";
import { isDuplicateEmail, createRegistrationRequest } from "@/lib/registration";
import { hashPassword } from "@/lib/password";
import { issueOtp } from "@/lib/otp";
import { saveUploadedFiles } from "@/lib/files";
import crypto from "node:crypto";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let rawData: any = {};
    let files: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const locationJson = formData.get("location");
      const contactJson = formData.get("contact_information");
      const tourTypesJson = formData.get("tour_types");

      files = formData.getAll("registration_documents") as File[];

      rawData = {
        full_name: formData.get("full_name"),
        email: formData.get("email"),
        password: formData.get("password"),
        confirm_password: formData.get("confirm_password"),
        company_name: formData.get("company_name"),
        company_type: formData.get("company_type"),
        tax_id: formData.get("tax_id"),
        location: locationJson ? JSON.parse(locationJson.toString()) : undefined,
        contact_information: contactJson ? JSON.parse(contactJson.toString()) : undefined,
        team_size: formData.get("team_size") ? Number(formData.get("team_size")) : undefined,
        tour_types: tourTypesJson ? JSON.parse(tourTypesJson.toString()) : undefined,
        registration_documents: files.length > 0 ? files : undefined,
      };
    } else {
      rawData = await request.json();
    }

    // Validate with registrationSchema
    const parseResult = registrationSchema.safeParse(rawData);
    if (!parseResult.success) {
      const validationErrors = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return NextResponse.json(
        { is_valid: false, validation_errors: validationErrors },
        { status: 422 }
      );
    }

    const validated = parseResult.data;

    // Check duplicate email
    const duplicate = await isDuplicateEmail(validated.email);
    if (duplicate) {
      return NextResponse.json(
        {
          is_valid: false,
          validation_errors: [{ field: "email", message: "Email already exists" }],
        },
        { status: 422 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(validated.password);

    // Save uploaded files if any
    const tempRequestId = crypto.randomUUID();
    let storedFiles: any[] = [];
    if (files.length > 0) {
      storedFiles = await saveUploadedFiles(tempRequestId, files);
    }

    // Create registration request
    const registrationRequestId = await createRegistrationRequest(
      validated,
      passwordHash,
      storedFiles
    );

    // Issue OTP
    await issueOtp(registrationRequestId, validated.email);

    return NextResponse.json(
      {
        registration_request_id: registrationRequestId,
        is_valid: true,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.field) {
      return NextResponse.json(
        {
          is_valid: false,
          validation_errors: [{ field: error.field, message: error.message }],
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { is_valid: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
