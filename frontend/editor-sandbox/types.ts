export interface Page {
  id: string;
  title: string;
  icon: string;
}

export interface Pages {
  shared: Page[];
  private: Page[];
}
