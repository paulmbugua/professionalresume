ALTER TABLE ONLY public.achievements          DROP CONSTRAINT IF EXISTS achievements_student_id_fkey;
ALTER TABLE ONLY public.classvault_purchases  DROP CONSTRAINT IF EXISTS fk_cvp_tutor;
ALTER TABLE ONLY public.classvault_purchases  DROP CONSTRAINT IF EXISTS purchases_student_id_fkey;
ALTER TABLE ONLY public.course_progress       DROP CONSTRAINT IF EXISTS course_progress_student_id_fkey;
ALTER TABLE ONLY public.course_purchases      DROP CONSTRAINT IF EXISTS course_purchases_student_id_fkey;
ALTER TABLE ONLY public.course_purchases      DROP CONSTRAINT IF EXISTS course_purchases_tutor_id_fkey;
