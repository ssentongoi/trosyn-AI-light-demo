export interface Page {
  id: string;
  title: string;
  icon?: React.ReactNode;
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface Pages {
  shared: Page[];
  private: Page[];
}
