"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, MessageSquare, Sparkles, Tag } from "lucide-react";
import { registrationSchema } from "@/lib/auth/registration-validation";
import { COMPANY_LABELS, TOUR_LABELS } from "../auth-v3/labels";
import "../auth-v3/auth-v3.css";

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

const FieldContext = React.createContext<{ errors: Record<string, string>; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void }>({ errors: {}, onChange: () => {} });

// Defined outside RegisterPage so the inputs keep focus while typing.
function Field({ id, label, name, type = "text", value, placeholder, hint, full, required = true, autoComplete }: {
  id: string; label: string; name: string; type?: string; value: string | number; placeholder?: string; hint?: string; full?: boolean; required?: boolean; autoComplete?: string;
}) {
  const { errors, onChange } = React.useContext(FieldContext);
  return (
    <div className={`av3-field${full ? " av3-field--full" : ""}`}>
      <label htmlFor={id}>{label}{required && <span className="av3-req" aria-hidden="true"> *</span>}</label>
      <input id={id} name={name} type={type} value={value} placeholder={placeholder} onChange={onChange} autoComplete={autoComplete}
        className={errors[name] ? "av3-invalid" : ""} aria-invalid={errors[name] ? true : undefined} aria-describedby={`${id}-note`} />
      {errors[name] ? <span id={`${id}-note`} className="av3-field__err" role="alert">{errors[name]}</span> : hint ? <span id={`${id}-note`} className="av3-field__hint">{hint}</span> : null}
    </div>
  );
}

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
      contact_information: { ...formData.contact_information, business_email: formData.contact_information.business_email || undefined },
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
          setGlobalError(data.error_message || data.message || "Registration failed. Please try again.");
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
        // Display only (png/18, png/18a): the OTP and status screens name the company and the send time.
        sessionStorage.setItem("registration_company", formData.company_name);
        sessionStorage.setItem("registration_submitted_at", new Date().toISOString());
      }

      router.push("/register/otp");
    } catch (err: any) {
      setGlobalError(err.message || "An unexpected network error occurred.");
      setIsSubmitting(false);
    }
  };

  // Mockup v3 png/17: four numbered section cards, a side panel with the next steps and what the account gives.
  // Fields and validation are unchanged. Mockup items with no field in the registration schema are not added.
  return (
    <div className="av3-reg">
      <header className="av3-reg__head">
        <h1 className="av3-h1">Đăng ký tài khoản công ty lữ hành</h1>
        <p className="av3-lead">Dành cho công ty lữ hành muốn đặt trải nghiệm làng nghề cho đoàn khách. Sở Du lịch Hà Nội sẽ kiểm tra thông tin trước khi kích hoạt tài khoản.</p>
      </header>

      {globalError && <div className="av3-alert av3-alert--danger" role="alert"><strong>{globalError}</strong></div>}

      <div className="av3-reg__grid">
        <FieldContext.Provider value={{ errors, onChange: handleInputChange }}>
        <form onSubmit={handleSubmit} className="av3-reg__form">
          <section className="av3-section">
            <h2><span className="av3-num">1</span>Tài khoản đăng nhập</h2>
            <div className="av3-cols">
              <Field id="email" label="Email đăng nhập" name="email" type="email" value={formData.email} placeholder="agency@example.com" hint="Mã OTP xác minh sẽ gửi về email này." autoComplete="email" />
              <Field id="password" label="Mật khẩu" name="password" type="password" value={formData.password} hint="Ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt." autoComplete="new-password" />
              <Field id="confirm_password" label="Nhập lại mật khẩu" name="confirm_password" type="password" value={formData.confirm_password} autoComplete="new-password" />
            </div>
          </section>

          <section className="av3-section">
            <h2><span className="av3-num">2</span>Thông tin công ty</h2>
            <div className="av3-cols">
              <Field id="company_name" label="Tên công ty" name="company_name" value={formData.company_name} hint="Đúng như trên giấy phép kinh doanh." />
              <Field id="tax_id" label="Mã số thuế" name="tax_id" value={formData.tax_id} hint="10 hoặc 13 chữ số." />
              <div className="av3-field">
                <label htmlFor="company_type">Loại hình <span className="av3-req" aria-hidden="true">*</span></label>
                <select id="company_type" name="company_type" value={formData.company_type} onChange={handleInputChange}>
                  {COMPANY_TYPES.map((type) => <option key={type} value={type} label={COMPANY_LABELS[type] ?? type}>{type}</option>)}
                </select>
              </div>
              <Field id="team_size" label="Số nhân viên" name="team_size" type="number" value={formData.team_size} />
              <Field id="location_street" label="Địa chỉ" name="location.street" value={formData.location.street} placeholder="22 phố Huế" />
              <Field id="location_ward" label="Phường" name="location.ward" value={formData.location.ward} />
              <Field id="location_district" label="Quận/Huyện" name="location.district" value={formData.location.district} />
              <Field id="location_city" label="Tỉnh/Thành phố" name="location.city_province" value={formData.location.city_province} />
            </div>
            <fieldset className="av3-tours">
              <legend>Loại tour công ty thường tổ chức <span className="av3-req" aria-hidden="true">*</span></legend>
              <div>
                {TOUR_TYPES.map((type) => (
                  <label key={type} className={`av3-chipcheck${formData.tour_types.includes(type) ? " av3-chipcheck--on" : ""}`}>
                    <input type="checkbox" checked={formData.tour_types.includes(type)} onChange={() => handleTourTypeToggle(type)} />{TOUR_LABELS[type] ?? type}
                  </label>
                ))}
              </div>
              {errors["tour_types"] && <span className="av3-field__err" role="alert">{errors["tour_types"]}</span>}
            </fieldset>
          </section>

          <section className="av3-section">
            <h2><span className="av3-num">3</span>Người liên hệ</h2>
            <div className="av3-cols">
              <Field id="full_name" label="Họ và tên" name="full_name" value={formData.full_name} placeholder="Nguyễn Văn A" autoComplete="name" />
              <Field id="phone_number" label="Số điện thoại" name="contact_information.phone_number" type="tel" value={formData.contact_information.phone_number} placeholder="+84912345678" autoComplete="tel" />
              <Field id="contact_person_name" label="Người liên hệ" name="contact_information.contact_person_name" value={formData.contact_information.contact_person_name} hint="Họ tên người đại diện." />
              <Field id="business_email" label="Email công việc" name="contact_information.business_email" type="email" value={formData.contact_information.business_email} required={false} hint="Nghệ nhân sẽ thấy email này khi trao đổi với bạn. Không bắt buộc." />
            </div>
          </section>

          <section className="av3-section">
            <h2><span className="av3-num">4</span>Giấy tờ pháp lý</h2>
            <label htmlFor="registration_documents" className="av3-drop">
              <strong>Kéo thả hoặc <span className="av3-link">chọn tệp</span></strong>
              <small>Giấy chứng nhận đăng ký doanh nghiệp, giấy phép lữ hành (nếu có). PDF, JPG hoặc PNG, tối đa 10 MB mỗi tệp, tối đa 5 tệp.</small>
              <input id="registration_documents" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="av3-sr" />
            </label>
            {files.length > 0 && (
              <ul className="av3-files">
                {files.map((file, idx) => (
                  <li key={`${file.name}-${idx}`}>
                    <span><strong>{file.name}</strong> · {(file.size / (1024 * 1024)).toFixed(1).replace(".", ",")} MB</span>
                    <button type="button" aria-label={`Xoá ${file.name}`} onClick={() => setFiles(files.filter((_, i) => i !== idx))}>
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {errors["registration_documents"] && <span className="av3-field__err" role="alert">{errors["registration_documents"]}</span>}
          </section>

          <div className="av3-reg__submit">
            <button type="submit" className="av3-btn av3-btn--primary" disabled={isSubmitting}>{isSubmitting ? "Đang gửi…" : "Xác minh email ›"}</button>
          </div>
        </form>
        </FieldContext.Provider>

        <aside className="av3-reg__side" aria-label="Thông tin thêm">
          <div className="av3-after">
            <h2>Sau khi gửi</h2>
            <ol>
              <li><strong>Nhập mã OTP</strong> gửi về email để xác minh.</li>
              <li><strong>Sở Du lịch Hà Nội kiểm tra</strong> giấy tờ. Thường xong trong 2 ngày làm việc.</li>
              <li><strong>Nhận email kết quả.</strong> Được duyệt là dùng được ngay.</li>
            </ol>
          </div>
          <div className="av3-perks">
            <h2>Có tài khoản công ty lữ hành, bạn có thể</h2>
            <ul>
              <li><span aria-hidden="true"><Tag size={20} /></span><div><strong>Xem giá từng trải nghiệm</strong><small>Giá mỗi khách và giá đoàn hiện rõ trước khi đặt.</small></div></li>
              <li><span aria-hidden="true"><MessageSquare size={20} /></span><div><strong>Nhắn tin trực tiếp với nghệ nhân</strong><small>Hỏi lịch, thống nhất yêu cầu của đoàn ngay trên web.</small></div></li>
              <li><span aria-hidden="true"><Sparkles size={20} /></span><div><strong>Nhờ AI gợi ý trải nghiệm</strong><small>Kể yêu cầu của đoàn, AI tìm trải nghiệm phù hợp.</small></div></li>
              <li><span aria-hidden="true"><CalendarCheck size={20} /></span><div><strong>Theo dõi đặt chỗ và thanh toán</strong><small>Giữ chỗ, thanh toán, hoàn tiền đều xem ở một nơi.</small></div></li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
