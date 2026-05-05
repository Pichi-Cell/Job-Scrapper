export interface JobListing {
  id: string;
  title: string;
  company: string;
  location?: string;
  remote?: boolean;
  url: string;
  salary?: string;
  description?: string;
  datePosted?: string;
  source: string;
}

