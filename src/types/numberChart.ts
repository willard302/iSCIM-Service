/** 數字圖卡組的種類：today 全站同一天共用、calculation 依輸入共用、user 每位會員各自一份 */
export type NumberChartSetKind = "today" | "calculation" | "user";

export type Gender = "male" | "female" | "other";

/** 影響圖卡內容的輸入；姓名不影響圖卡，不收也不存 */
export interface NumberChartInput {
  /** YYYY-MM-DD */
  birthDate: string;
  /** HH:mm */
  birthTime?: string;
  gender?: Gender;
}

export interface NumberChartFile {
  cardId: string;
  fileName: string;
}

/** 圖卡組的 manifest.json；input 供之後補產生其他卡片 */
export interface NumberChartSetManifest {
  id: string;
  kind: NumberChartSetKind;
  input: NumberChartInput;
  cards: NumberChartFile[];
  createdAt: string;
  lastAccessedAt: string;
}

/** 會員指向自己的圖卡組；inputDigest 用來判斷生日等資料是否變更 */
export interface NumberChartUserPointer {
  setId: string;
  inputDigest: string;
}

export interface NumberChartCard {
  cardId: string;
  url: string;
}

export interface NumberChartSetResult {
  setId: string;
  kind: NumberChartSetKind;
  cards: NumberChartCard[];
  createdAt: string;
}
