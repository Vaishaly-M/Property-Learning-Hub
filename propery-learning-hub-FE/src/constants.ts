// types/index.ts
export interface User {
  name: string;
  id: string;
  email: string;

  progress?: number;   
  membership?: string;  

  avatar?: string;
  role?: string;         
  memberSince?: string; 
}


export interface QuickStat {
  title: string;
  value: number;
  icon: string;
}

export interface VideoLesson {
  id: string;
  title: string;
  duration: string;
  progress: number;
}

export interface Webinar {
  id: string;
  title: string;
  date: string;
  time: string;
  registered: boolean;
}

export interface Deal {
  id: string;
  title: string;
  type: string;
  location: string;
  price: string;
}

export interface ContractTemplate {
  id: string;
  title: string;
  category: string;
}