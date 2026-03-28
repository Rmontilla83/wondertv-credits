-- Migration v8: Chat conversations storage
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  messages JSONB NOT NULL DEFAULT '[]',
  lead_name TEXT,
  lead_email TEXT,
  lead_phone TEXT,
  plan_interest TEXT,
  transferred_to_whatsapp BOOLEAN DEFAULT FALSE,
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view conversations"
  ON public.chat_conversations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can insert conversations"
  ON public.chat_conversations FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update own conversations"
  ON public.chat_conversations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
