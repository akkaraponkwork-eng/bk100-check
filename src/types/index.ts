export interface Task {
  id: string;
  category: 'หมวดที่ 1' | 'หมวดที่ 2';
  taskName: string;
  location: string;
  count: number | '';
  remark: string;
  isFixed?: boolean;
}
