INSERT INTO public.user_roles (user_id, role) 
VALUES ('667df445-02e5-4a32-a7c0-fa6d9db9d42d', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;