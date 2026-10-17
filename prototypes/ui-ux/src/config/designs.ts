import { productCopy } from '../lib/copy';

export type DesignId = 'harbor' | 'control' | 'ledger';
export type ScreenId = 'overview' | 'documents' | 'reconcile' | 'consolidation' | 'review';
export type StudioScreen = ScreenId | 'landing';
export type ThemeTokens = Record<
  | 'accent'
  | 'accentSoft'
  | 'secondary'
  | 'secondarySoft'
  | 'canvas'
  | 'surface'
  | 'ink'
  | 'muted'
  | 'border'
  | 'nav'
  | 'navInk'
  | 'artBase'
  | 'artGlow'
  | 'artPaper'
  | 'artHighlight'
  | 'radius'
  | 'headingFont'
  | 'density',
  string
>;
export type Design = {
  id: DesignId;
  letter: string;
  name: string;
  label: string;
  description: string;
  audience: string;
  tradeoff: string;
  keywords: string[];
  tokens: ThemeTokens;
};

export const designs: Design[] = [
  {
    id: 'harbor',
    letter: 'A',
    name: 'Harbor',
    label: 'Rõ từng bước. Vững từng hồ sơ.',
    description: 'Một hành trình có hướng dẫn, giúp người mới nắm được việc cần làm tiếp theo.',
    audience: productCopy.harborAudience,
    tradeoff: 'Nhiều hướng dẫn hơn; ít dữ liệu xuất hiện cùng lúc.',
    keywords: ['Hướng dẫn theo bước', 'Thoáng & dễ tiếp cận', 'Teal / Trắng'],
    tokens: {
      accent: '#26766b',
      accentSoft: '#edf5f2',
      secondary: '#dd967a',
      secondarySoft: '#faeee5',
      canvas: '#f6f7f4',
      surface: '#ffffff',
      ink: '#29343d',
      muted: '#65717a',
      border: '#e2e6e8',
      nav: '#ffffff',
      navInk: '#5c6972',
      artBase: '#eaf0e8',
      artGlow: '#dd967a',
      artPaper: '#fffdf6',
      artHighlight: '#f5e4c7',
      radius: '9px',
      headingFont: '"Be Vietnam Pro", sans-serif',
      density: '16px',
    },
  },
  {
    id: 'control',
    letter: 'B',
    name: 'Control',
    label: 'Mọi bằng chứng. Một góc nhìn.',
    description: 'Bàn làm việc đối chiếu, đặt chứng từ, dữ liệu và vấn đề ngay cạnh nhau.',
    audience: 'Nhân viên chứng từ · Người rà soát',
    tradeoff: 'Xử lý nhanh nhiều thông tin; cần màn hình đủ rộng.',
    keywords: ['Đối chiếu đa panel', 'Ưu tiên vấn đề', 'Navy / Cobalt'],
    tokens: {
      accent: '#4655df',
      accentSoft: '#eceeff',
      secondary: '#b9adff',
      secondarySoft: '#f1edff',
      canvas: '#f3f2f9',
      surface: '#ffffff',
      ink: '#18273e',
      muted: '#586783',
      border: '#dce3ee',
      nav: '#1c1c38',
      navInk: '#bac8df',
      artBase: '#211f38',
      artGlow: '#8c6dde',
      artPaper: '#fdfbff',
      artHighlight: '#d4e9b8',
      radius: '9px',
      headingFont: '"Be Vietnam Pro", sans-serif',
      density: '12px',
    },
  },
  {
    id: 'ledger',
    letter: 'C',
    name: 'Ledger',
    label: 'Chính xác trong từng trường dữ liệu.',
    description:
      'Biểu mẫu và bảng nghiệp vụ quen thuộc, gọn gàng như một bộ hồ sơ được sắp xếp tốt.',
    audience: 'Nhân viên khai báo · Người quen ECUS',
    tradeoff: 'Dữ liệu cô đọng; người mới cần thời gian làm quen.',
    keywords: ['Biểu mẫu theo tab', 'Bảng dữ liệu cô đọng', 'Forest / Ivory'],
    tokens: {
      accent: '#21563f',
      accentSoft: '#e6efe3',
      secondary: '#ce9852',
      secondarySoft: '#f7eedb',
      canvas: '#f5f1e8',
      surface: '#fffefb',
      ink: '#293c30',
      muted: '#646e5d',
      border: '#dedfd4',
      nav: '#eeeee5',
      navInk: '#526047',
      artBase: '#f5f0e5',
      artGlow: '#a36544',
      artPaper: '#fffdf6',
      artHighlight: '#a36544',
      radius: '4px',
      headingFont: '"Lora", serif',
      density: '9px',
    },
  },
];

export const screens: {
  id: ScreenId;
  label: string;
  short: string;
  step: string;
  description: string;
}[] = [
  {
    id: 'overview',
    label: 'Tổng quan hồ sơ',
    short: 'Tổng quan',
    step: '01',
    description: 'Công việc hôm nay và các hồ sơ đang theo dõi.',
  },
  {
    id: 'documents',
    label: 'Bộ chứng từ',
    short: 'Chứng từ',
    step: '02',
    description: 'Tập hợp chứng từ, kiểm tra dữ liệu được đọc và nguồn tham chiếu.',
  },
  {
    id: 'reconcile',
    label: 'Đối chiếu dữ liệu',
    short: 'Đối chiếu',
    step: '03',
    description: 'Mỗi khác biệt đều có bằng chứng để bạn kiểm tra.',
  },
  {
    id: 'consolidation',
    label: 'Dữ liệu tổng hợp',
    short: 'Tổng hợp',
    step: '04',
    description: 'Chọn giá trị sử dụng, giữ nguồn và lý do cho từng trường dữ liệu.',
  },
  {
    id: 'review',
    label: 'Rà soát & xuất Excel',
    short: 'Rà soát',
    step: '05',
    description: 'Kiểm tra dữ liệu, phiên bản mẫu và mapping trước khi xuất Excel.',
  },
];

export const feedbackCriteria = [
  'Dễ hiểu cách sử dụng',
  'Dễ tìm và xử lý sai lệch',
  'Dễ xem chứng từ gốc',
  'Thuận tiện nhập dữ liệu',
  'Phù hợp nghiệp vụ hải quan',
];
export const getDesign = (id: DesignId) => designs.find((d) => d.id === id)!;
