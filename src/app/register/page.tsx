"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { registrationSchema } from "@/lib/validation";

const TOUR_TYPES = [
  "Cultural/Heritage",
  "Craft Village/Experiential",
  "Culinary",
  "Educational/Study Tour",
  "Corporate/MICE",
  "Family/Leisure",
  "Other",
] as const;

const COMPANY_TYPES = ["Travel Agency", "Tour Operator", "TMC"] as const;

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
    company_name: "",
    company_type: "Travel Agency",
    tax_id: "",
    location: {
      street: "",
      ward: "",
      district: "",
      city_province: "Ha Noi",
    },
    contact_information: {
      contact_person_name: "",
      phone_number: "",
      business_email: "",
    },
    team_size: 1,
    tour_types: [] as string[],
  });

  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name.startsWith("location.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        location: { ...prev.location, [field]: value },
      }));
    } else if (name.startsWith("contact_information.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        contact_information: { ...prev.contact_information, [field]: value },
      }));
    } else if (name === "team_size") {
      setFormData((prev) => ({
        ...prev,
        team_size: parseInt(value, 10) || 0,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleTourTypeToggle = (type: string) => {
    setFormData((prev) => {
      const exists = prev.tour_types.includes(type);
      if (exists) {
        return {
          ...prev,
          tour_types: prev.tour_types.filter((t) => t !== type),
        };
      } else {
        return {
          ...prev,
          tour_types: [...prev.tour_types, type],
        };
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles(selected);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);
    setErrors({});

    // Client-side preview validation
    const candidateData = {
      ...formData,
      registration_documents: files,
    };

    const parseResult = registrationSchema.safeParse(candidateData);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const path = issue.path.join(".");
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      setErrors(fieldErrors);
      setGlobalError("Please correct the highlighted errors before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const body = new FormData();
      body.append("full_name", formData.full_name);
      body.append("email", formData.email);
      body.append("password", formData.password);
      body.append("confirm_password", formData.confirm_password);
      body.append("company_name", formData.company_name);
      body.append("company_type", formData.company_type);
      body.append("tax_id", formData.tax_id);
      body.append("team_size", formData.team_size.toString());

      body.append("location[street]", formData.location.street);
      body.append("location[ward]", formData.location.ward);
      body.append("location[district]", formData.location.district);
      body.append("location[city_province]", formData.location.city_province);

      body.append(
        "contact_information[contact_person_name]",
        formData.contact_information.contact_person_name
      );
      body.append(
        "contact_information[phone_number]",
        formData.contact_information.phone_number
      );
      if (formData.contact_information.business_email) {
        body.append(
          "contact_information[business_email]",
          formData.contact_information.business_email
        );
      }

      formData.tour_types.forEach((type) => {
        body.append("tour_types[]", type);
      });

      files.forEach((file) => {
        body.append("registration_documents", file);
      });

      const res = await fetch("/api/register", {
        method: "POST",
        body,
      });

      const data = await res.json();

      if (!res.ok || !data.is_valid) {
        if (data.validation_errors && Array.isArray(data.validation_errors)) {
          const serverErrors: Record<string, string> = {};
          data.validation_errors.forEach((err: { field: string; message: string }) => {
            serverErrors[err.field] = err.message;
          });
          setErrors(serverErrors);
          setGlobalError("Submission failed. Please check the form errors.");
        } else {
          setGlobalError(data.error_message || "Registration failed. Please try again.");
        }
        setIsSubmitting(false);
        return;
      }

      // Success
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "registration_request_id",
          data.registration_request_id
        );
        sessionStorage.setItem("registration_email", formData.email);
      }

      router.push("/register/otp");
    } catch (err: any) {
      setGlobalError(err.message || "An unexpected network error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h1 className="card-title">Agency Registration</h1>
        <p className="card-subtitle">
          Create an account and submit your company information for HDT verification.
          Self-registration is available for Tour Agencies.
        </p>
      </div>

      {globalError && <div className="alert alert-danger">{globalError}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* Section 1: Account Information */}
          <div className="form-section">Account Credentials</div>

          <div className="form-group">
            <label htmlFor="full_name">
              Full name <span className="required-star">*</span>
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              placeholder="e.g. Nguyen Van A"
              value={formData.full_name}
              onChange={handleInputChange}
              className={errors["full_name"] ? "is-invalid" : ""}
            />
            {errors["full_name"] && (
              <span className="field-error">{errors["full_name"]}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">
              Email <span className="required-star">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="agency@example.com"
              value={formData.email}
              onChange={handleInputChange}
              className={errors["email"] ? "is-invalid" : ""}
            />
            {errors["email"] && (
              <span className="field-error">{errors["email"]}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Password <span className="required-star">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="8+ chars, upper, lower, digit, special"
              value={formData.password}
              onChange={handleInputChange}
              className={errors["password"] ? "is-invalid" : ""}
            />
            {errors["password"] && (
              <span className="field-error">{errors["password"]}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirm_password">
              Confirm password <span className="required-star">*</span>
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              placeholder="Re-enter password"
              value={formData.confirm_password}
              onChange={handleInputChange}
              className={errors["confirm_password"] ? "is-invalid" : ""}
            />
            {errors["confirm_password"] && (
              <span className="field-error">{errors["confirm_password"]}</span>
            )}
          </div>

          {/* Section 2: Company Information */}
          <div className="form-section">Company & Legal Information</div>

          <div className="form-group">
            <label htmlFor="company_name">
              Company name <span className="required-star">*</span>
            </label>
            <input
              id="company_name"
              name="company_name"
              type="text"
              placeholder="Company / Travel Agency Name"
              value={formData.company_name}
              onChange={handleInputChange}
              className={errors["company_name"] ? "is-invalid" : ""}
            />
            {errors["company_name"] && (
              <span className="field-error">{errors["company_name"]}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="company_type">
              Company type <span className="required-star">*</span>
            </label>
            <select
              id="company_type"
              name="company_type"
              value={formData.company_type}
              onChange={handleInputChange}
            >
              {COMPANY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="tax_id">
              Tax ID <span className="required-star">*</span>
            </label>
            <input
              id="tax_id"
              name="tax_id"
              type="text"
              placeholder="10 or 13 digits"
              value={formData.tax_id}
              onChange={handleInputChange}
              className={errors["tax_id"] ? "is-invalid" : ""}
            />
            {errors["tax_id"] && (
              <span className="field-error">{errors["tax_id"]}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="team_size">
              Team size <span className="required-star">*</span>
            </label>
            <input
              id="team_size"
              name="team_size"
              type="number"
              min="1"
              value={formData.team_size}
              onChange={handleInputChange}
              className={errors["team_size"] ? "is-invalid" : ""}
            />
            {errors["team_size"] && (
              <span className="field-error">{errors["team_size"]}</span>
            )}
          </div>

          {/* Section 3: Location */}
          <div className="form-section">Location</div>

          <div className="form-group">
            <label htmlFor="location_street">
              Street address <span className="required-star">*</span>
            </label>
            <input
              id="location_street"
              name="location.street"
              type="text"
              placeholder="e.g. 12 Hang Gai"
              value={formData.location.street}
              onChange={handleInputChange}
              className={errors["location.street"] ? "is-invalid" : ""}
            />
            {errors["location.street"] && (
              <span className="field-error">{errors["location.street"]}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="location_ward">
              Ward <span className="required-star">*</span>
            </label>
            <input
              id="location_ward"
              name="location.ward"
              type="text"
              placeholder="e.g. Hang Trong"
              value={formData.location.ward}
              onChange={handleInputChange}
              className={errors["location.ward"] ? "is-invalid" : ""}
            />
            {errors["location.ward"] && (
              <span className="field-error">{errors["location.ward"]}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="location_district">
              District <span className="required-star">*</span>
            </label>
            <input
              id="location_district"
              name="location.district"
              type="text"
              placeholder="e.g. Hoan Kiem"
              value={formData.location.district}
              onChange={handleInputChange}
              className={errors["location.district"] ? "is-invalid" : ""}
            />
            {errors["location.district"] && (
              <span className="field-error">{errors["location.district"]}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="location_city">
              City / Province <span className="required-star">*</span>
            </label>
            <input
              id="location_city"
              name="location.city_province"
              type="text"
              value={formData.location.city_province}
              onChange={handleInputChange}
              className={errors["location.city_province"] ? "is-invalid" : ""}
            />
            {errors["location.city_province"] && (
              <span className="field-error">
                {errors["location.city_province"]}
              </span>
            )}
          </div>

          {/* Section 4: Contact Information */}
          <div className="form-section">Contact Information</div>

          <div className="form-group">
            <label htmlFor="contact_person_name">
              Contact person name <span className="required-star">*</span>
            </label>
            <input
              id="contact_person_name"
              name="contact_information.contact_person_name"
              type="text"
              placeholder="Full name of representative"
              value={formData.contact_information.contact_person_name}
              onChange={handleInputChange}
              className={
                errors["contact_information.contact_person_name"]
                  ? "is-invalid"
                  : ""
              }
            />
            {errors["contact_information.contact_person_name"] && (
              <span className="field-error">
                {errors["contact_information.contact_person_name"]}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="phone_number">
              Phone number <span className="required-star">*</span>
            </label>
            <input
              id="phone_number"
              name="contact_information.phone_number"
              type="tel"
              placeholder="10-15 digits (e.g. +84912345678)"
              value={formData.contact_information.phone_number}
              onChange={handleInputChange}
              className={
                errors["contact_information.phone_number"] ? "is-invalid" : ""
              }
            />
            {errors["contact_information.phone_number"] && (
              <span className="field-error">
                {errors["contact_information.phone_number"]}
              </span>
            )}
          </div>

          <div className="form-group full-width">
            <label htmlFor="business_email">Business email (optional)</label>
            <input
              id="business_email"
              name="contact_information.business_email"
              type="email"
              placeholder="contact@agency.com"
              value={formData.contact_information.business_email}
              onChange={handleInputChange}
              className={
                errors["contact_information.business_email"] ? "is-invalid" : ""
              }
            />
            {errors["contact_information.business_email"] && (
              <span className="field-error">
                {errors["contact_information.business_email"]}
              </span>
            )}
          </div>

          {/* Section 5: Tour Types */}
          <div className="form-section">
            Tour Types (select at least one) <span className="required-star">*</span>
          </div>

          <div className="form-group full-width">
            <div className="checkbox-grid">
              {TOUR_TYPES.map((type) => (
                <label key={type} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.tour_types.includes(type)}
                    onChange={() => handleTourTypeToggle(type)}
                  />
                  {type}
                </label>
              ))}
            </div>
            {errors["tour_types"] && (
              <span className="field-error">{errors["tour_types"]}</span>
            )}
          </div>

          {/* Section 6: Registration Documents */}
          <div className="form-section">
            Registration Documents (PDF/JPG/PNG, ≤10MB each, max 5 files){" "}
            <span className="required-star">*</span>
          </div>

          <div className="form-group full-width">
            <div className="file-input-wrapper">
              <label htmlFor="registration_documents" style={{ cursor: "pointer" }}>
                <div>Click to select documents (Business Registration Certificate required)</div>
                <input
                  id="registration_documents"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </label>
            </div>

            {files.length > 0 && (
              <ul className="file-list">
                {files.map((file, idx) => (
                  <li key={idx} className="file-item">
                    <span>{file.name}</span>
                    <span style={{ color: "#64748b" }}>
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {errors["registration_documents"] && (
              <span className="field-error">
                {errors["registration_documents"]}
              </span>
            )}
          </div>
        </div>

        <div className="btn-group">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Continue to email verification"}
          </button>
          <a href="#" className="btn btn-secondary">
            Sign in
          </a>
        </div>
      </form>
    </div>
  );
}
