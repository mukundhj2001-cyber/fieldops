/**
 * Scripted FAQ / call-flow lines for Cyberfield Support.
 * Each id is stable so Jev (mock or real) can select by script_id.
 */

export type ScriptLine = {
  id: string;
  category: string;
  text: string;
};

export const SCRIPTS: ScriptLine[] = [
  {
    id: "greeting",
    category: "open",
    text: "Thank you for calling Cyberfield Support. My name is Avery, your virtual field operations assistant. How can I help you today?",
  },
  {
    id: "greeting_return",
    category: "open",
    text: "Welcome back to Cyberfield Support. How can I assist you further?",
  },
  {
    id: "hours",
    category: "faq",
    text: "Our support hours are Monday through Friday, 8:00 AM to 8:00 PM Eastern, and Saturday 9:00 AM to 5:00 PM Eastern. We're closed on Sundays and major U.S. holidays.",
  },
  {
    id: "hours_callback",
    category: "faq",
    text: "If you need help outside those hours, leave a voicemail or email support@cyberfield.example and we'll follow up on the next business day.",
  },
  {
    id: "location",
    category: "faq",
    text: "Cyberfield Support is based in Austin, Texas, and we serve customers nationwide through phone, chat, and our field technician network.",
  },
  {
    id: "booking_ask",
    category: "booking",
    text: "I'd be happy to help schedule a visit. What day and time window work best for you?",
  },
  {
    id: "booking_confirm",
    category: "booking",
    text: "You're all set. I've reserved a technician visit and will send a confirmation to the email on file. Is there anything else I can help with?",
  },
  {
    id: "booking_reschedule",
    category: "booking",
    text: "No problem — I can reschedule that appointment. Please share the new preferred date and a morning or afternoon window.",
  },
  {
    id: "booking_cancel",
    category: "booking",
    text: "I've cancelled the appointment. You won't be charged a cancellation fee when you cancel at least 24 hours ahead. Need to book again later?",
  },
  {
    id: "shipping_status",
    category: "orders",
    text: "I can look up shipping status with your order number. Please share the order ID, and I'll pull the latest tracking update.",
  },
  {
    id: "refund_policy_brief",
    category: "orders",
    text: "Refunds are available within 30 days of delivery for unused items in original packaging. Would you like me to start a refund request or connect you with a specialist?",
  },
  {
    id: "escalate_apology",
    category: "escalate",
    text: "I'm sorry for the trouble — this sounds like something our specialist team should handle. I'm opening a priority ticket and connecting you now.",
  },
  {
    id: "escalate_hold",
    category: "escalate",
    text: "Please stay on the line while I transfer you. Your place in queue is reserved and I've attached this conversation for context.",
  },
  {
    id: "clarify",
    category: "repair",
    text: "I want to make sure I help correctly. Could you rephrase that, or share an order number, appointment date, or the product you're calling about?",
  },
  {
    id: "thanks",
    category: "close",
    text: "You're welcome. Is there anything else I can help with today?",
  },
  {
    id: "goodbye",
    category: "close",
    text: "Thank you for choosing Cyberfield Support. Have a great day — goodbye.",
  },
  {
    id: "privacy",
    category: "faq",
    text: "We only use your contact details to resolve support requests and schedule field visits. You can request a data export or deletion by emailing privacy@cyberfield.example.",
  },
  {
    id: "warranty",
    category: "faq",
    text: "Most hardware carries a 12-month limited warranty covering manufacturing defects. Accidental damage and consumables aren't covered. I can check warranty status with a serial number.",
  },
  {
    id: "technician_eta",
    category: "field",
    text: "Once a technician is assigned, you'll get an SMS with a two-hour arrival window. On the day of service we send a live ETA about 30 minutes before arrival.",
  },
  {
    id: "pricing_visit",
    category: "faq",
    text: "Standard on-site diagnostic visits start at $79. Parts and additional labor are quoted before work begins, and you approve anything beyond the diagnostic fee.",
  },
  {
    id: "account_reset",
    category: "account",
    text: "I can send a secure password-reset link to the email on your account. Confirm the email address you'd like me to use.",
  },
  {
    id: "complaint_ack",
    category: "escalate",
    text: "I'm sorry we fell short of your expectations. I'm logging this as a formal complaint and escalating to a team lead who will follow up within one business day.",
  },
];

export function getScriptById(id: string): ScriptLine | undefined {
  return SCRIPTS.find((s) => s.id === id);
}

export function scriptText(id: string, fallback?: string): string {
  return getScriptById(id)?.text ?? fallback ?? SCRIPTS.find((s) => s.id === "clarify")!.text;
}
