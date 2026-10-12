export type IUserRegisterPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string;
};

export type IUserVerifyEmailPayload = {
  email: string;
  otp: string;
};
