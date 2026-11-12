/** Shape of the first-party attribution record the lead form carries (see README). */
export type TagKey =
  | 'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_term' | 'utm_content'
  | 'gclid' | 'gbraid' | 'wbraid' | 'fbclid' | 'msclkid' | 'ttclid' | 'li_fat_id';

export type Attribution = Partial<Record<TagKey, string>> & {
  /** Path the visitor landed on, without the query string. */
  landing_page: string;
  /** Origin of the referring site, or empty for direct and same-site. */
  referrer: string;
  /** When this touch was recorded (ISO 8601). Meta's fbc needs it. */
  captured_at: string;
};
