export interface QuestionAnswer {
  _id?: string;
  user?: { _id: string; name?: string; profilePicture?: string; role?: string };
  text: string;
  isOfficial: boolean;
  createdAt?: string;
}

export interface ProductQuestion {
  _id: string;
  product: string;
  user?: { _id: string; name?: string; profilePicture?: string };
  text: string;
  answers: QuestionAnswer[];
  isVisible: boolean;
  createdAt?: string;
}
