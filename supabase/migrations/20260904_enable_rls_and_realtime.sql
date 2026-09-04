-- Enable Realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE "Task";
ALTER PUBLICATION supabase_realtime ADD TABLE "Note";
ALTER PUBLICATION supabase_realtime ADD TABLE "Goal";
ALTER PUBLICATION supabase_realtime ADD TABLE "Reminder";
ALTER PUBLICATION supabase_realtime ADD TABLE "ProductivityScore";

-- Enable RLS on all user-scoped tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Note" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Goal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reminder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Milestone" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductivityScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WeeklyReview" ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data

CREATE POLICY "Users can view own profile" ON "User" FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Users can update own profile" ON "User" FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY "Users can view own tasks" ON "Task" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can insert own tasks" ON "Task" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update own tasks" ON "Task" FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete own tasks" ON "Task" FOR DELETE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can view own notes" ON "Note" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can insert own notes" ON "Note" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update own notes" ON "Note" FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete own notes" ON "Note" FOR DELETE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can view own goals" ON "Goal" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can insert own goals" ON "Goal" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update own goals" ON "Goal" FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete own goals" ON "Goal" FOR DELETE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can view own categories" ON "Category" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can insert own categories" ON "Category" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update own categories" ON "Category" FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete own categories" ON "Category" FOR DELETE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can view own tags" ON "Tag" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can insert own tags" ON "Tag" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update own tags" ON "Tag" FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete own tags" ON "Tag" FOR DELETE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can view own reminders" ON "Reminder" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can insert own reminders" ON "Reminder" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update own reminders" ON "Reminder" FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete own reminders" ON "Reminder" FOR DELETE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can view own projects" ON "Project" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can insert own projects" ON "Project" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update own projects" ON "Project" FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete own projects" ON "Project" FOR DELETE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can view own productivity scores" ON "ProductivityScore" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can insert own productivity scores" ON "ProductivityScore" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update own productivity scores" ON "ProductivityScore" FOR UPDATE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can view own weekly reviews" ON "WeeklyReview" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can insert own weekly reviews" ON "WeeklyReview" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update own weekly reviews" ON "WeeklyReview" FOR UPDATE USING (auth.uid()::text = "userId");

-- Storage policies for avatars bucket (public read, authenticated write)
-- Note: These are set via Supabase Dashboard or supabase CLI storage commands
-- Below are the SQL equivalents for reference

-- Allow public read of avatars
-- CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- Allow authenticated users to upload their own avatar
-- CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to read their own attachments
-- CREATE POLICY "Users read own attachments" ON storage.objects FOR SELECT USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
-- Allow authenticated users to upload attachments
-- CREATE POLICY "Users upload attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
-- Allow authenticated users to delete their own attachments
-- CREATE POLICY "Users delete own attachments" ON storage.objects FOR DELETE USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
