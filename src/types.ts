export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  bgColor: string;
}

export interface FlowCard {
  id: string;
  title: string;
  description: string;
  columnId: string;
  priority: Priority;
  tags: string[];
  dueDate?: string;
  assignee?: string;
  checklist: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface FlowColumn {
  id: string;
  title: string;
  color: string;
  wipLimit?: number;
}

export interface FilterOptions {
  search: string;
  priority: Priority | 'all';
  tag: string | 'all';
}
