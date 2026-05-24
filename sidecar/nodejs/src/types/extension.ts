export interface ExtensionEntry {
  id: string;
  name: string;
  version: string;
  localPath: string;
  status: 'active' | 'inactive';
  createdAt: number;
}
