function formatVND(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function toDDMM(d: string): string {
  const parts = d.split('-');
  return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : d;
}

export function buildResultsMessage({
  count,
  group_size,
  start_date,
  end_date,
  max_budget_per_person,
}: {
  count: number;
  group_size?: number;
  start_date?: string;
  end_date?: string;
  max_budget_per_person?: number;
}): string {
  let msg = `Tìm thấy ${count} đề xuất`;
  if (group_size != null) {
    msg += ` cho đoàn ${group_size} người`;
  }

  const clauses: string[] = [];
  if (start_date) {
    if (end_date && end_date !== start_date) {
      clauses.push(`từ ${toDDMM(start_date)} đến ${toDDMM(end_date)}`);
    } else {
      clauses.push(`ngày ${toDDMM(start_date)}`);
    }
  }

  if (max_budget_per_person != null) {
    clauses.push(`ngân sách tối đa ${formatVND(max_budget_per_person)}đ/người`);
  }

  if (clauses.length > 0) {
    msg += ', ' + clauses.join(', ');
  }

  return msg + '.';
}

export function refusalTemplate(
  kind: string,
  options: { field?: string } = {}
): { message: string; quick_replies: string[] } {
  switch (kind) {
    case 'out_of_scope':
      return {
        message:
          'Xin lỗi, mình không thể trả lời yêu cầu này vì nằm ngoài phạm vi nền tảng. Bạn muốn mình gợi ý trải nghiệm văn hóa có trong dữ liệu hay tiếp tục ghép tour làng nghề theo số khách, ngày và ngân sách?',
        quick_replies: ['Bắt đầu ghép tour', 'Xem các làng nghề'],
      };
    case 'restricted':
      return {
        message:
          'Mình không chia sẻ được thông tin của agency khác hoặc cấu hình hệ thống. Mình có thể giúp bạn với yêu cầu tour của riêng bạn.',
        quick_replies: ['Bắt đầu ghép tour'],
      };
    case 'no_permission':
      return {
        message: 'Tài khoản của bạn chưa có quyền thực hiện thao tác này.',
        quick_replies: ['Liên kết trợ giúp'],
      };
    case 'missing_data':
      return {
        message: `Hiện chưa có dữ liệu về ${options.field ?? ''} cho mục này.`,
        quick_replies: [],
      };
    case 'system_error':
    default:
      return {
        message:
          'Mình chưa xử lý được lúc này. Bạn thử lại hoặc nhập yêu cầu theo từng thông tin (số người, ngày, ngân sách) nhé.',
        quick_replies: ['Thử lại'],
      };
  }
}
