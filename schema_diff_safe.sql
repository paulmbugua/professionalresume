





















alter table "public"."profiles" add column "country" character(2);

alter table "public"."profiles" add column "country_code" text;

alter table "public"."profiles" add column "grade_bands" text[] default '{}'::text[];

alter table "public"."profiles" add column "region" text;

alter table "public"."profiles" add column "school_grade" character varying(64);




alter table "public"."users" add column "deleted_at" timestamp with time zone;

alter table "public"."users" add column "is_active" boolean not null default true;


CREATE INDEX idx_profiles_tutor_country ON public.profiles USING btree (country_code) WHERE (role = 'tutor'::text);

CREATE INDEX idx_profiles_tutor_grade_bands_gin ON public.profiles USING gin (grade_bands) WHERE (role = 'tutor'::text);

CREATE INDEX idx_profiles_tutor_region ON public.profiles USING btree (region) WHERE (role = 'tutor'::text);

alter table "public"."profiles" add constraint "profiles_country_code_iso2_chk" CHECK (((country_code IS NULL) OR (country_code ~ '^[A-Z]{2}$'::text))) not valid;

alter table "public"."profiles" validate constraint "profiles_country_code_iso2_chk";

alter table "public"."achievements" add constraint "achievements_student_id_fkey" FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."achievements" validate constraint "achievements_student_id_fkey";

alter table "public"."classvault_purchases" add constraint "fk_cvp_tutor" FOREIGN KEY (tutor_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."classvault_purchases" validate constraint "fk_cvp_tutor";

alter table "public"."classvault_purchases" add constraint "purchases_student_id_fkey" FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."classvault_purchases" validate constraint "purchases_student_id_fkey";

alter table "public"."course_progress" add constraint "course_progress_student_id_fkey" FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."course_progress" validate constraint "course_progress_student_id_fkey";

alter table "public"."course_purchases" add constraint "course_purchases_student_id_fkey" FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."course_purchases" validate constraint "course_purchases_student_id_fkey";

alter table "public"."course_purchases" add constraint "course_purchases_tutor_id_fkey" FOREIGN KEY (tutor_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."course_purchases" validate constraint "course_purchases_tutor_id_fkey";

alter table "public"."course_reviews" add constraint "course_reviews_student_id_fkey" FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."course_reviews" validate constraint "course_reviews_student_id_fkey";

alter table "public"."enrollments" add constraint "enrollments_student_id_fkey" FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."enrollments" validate constraint "enrollments_student_id_fkey";

alter table "public"."org_assignment_enrollments" add constraint "org_assignment_enrollments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."org_assignment_enrollments" validate constraint "org_assignment_enrollments_user_id_fkey";

alter table "public"."org_quiz_attempts" add constraint "org_quiz_attempts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."org_quiz_attempts" validate constraint "org_quiz_attempts_user_id_fkey";

alter table "public"."payments" add constraint "payments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."payments" validate constraint "payments_user_id_fkey";

alter table "public"."recorded_video_reviews" add constraint "recorded_video_reviews_student_id_fkey" FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."recorded_video_reviews" validate constraint "recorded_video_reviews_student_id_fkey";

alter table "public"."recorded_videos" add constraint "recorded_videos_tutor_id_fkey" FOREIGN KEY (tutor_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."recorded_videos" validate constraint "recorded_videos_tutor_id_fkey";

alter table "public"."reviews" add constraint "reviews_student_id_fkey" FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."reviews" validate constraint "reviews_student_id_fkey";

alter table "public"."reviews" add constraint "reviews_tutor_id_fkey" FOREIGN KEY (tutor_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."reviews" validate constraint "reviews_tutor_id_fkey";

alter table "public"."transactions" add constraint "transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."transactions" validate constraint "transactions_user_id_fkey";


