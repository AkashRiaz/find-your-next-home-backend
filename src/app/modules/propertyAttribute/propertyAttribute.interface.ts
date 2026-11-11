/** An attribute value: text, number, yes/no, or a list of text/numbers. */
export type IPropertyAttributeValue =
  | string
  | number
  | boolean
  | (string | number)[];

export interface IUpsertPropertyAttributePayload {
  value: IPropertyAttributeValue;
}

export interface IReplacePropertyAttributesPayload {
  attributes: {
    key: string;
    value: IPropertyAttributeValue;
  }[];
}
