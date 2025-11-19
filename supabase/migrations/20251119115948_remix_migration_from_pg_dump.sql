--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: bill_frequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bill_frequency AS ENUM (
    'monthly',
    'yearly',
    'custom'
);


--
-- Name: goal_period; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.goal_period AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'yearly',
    'custom'
);


--
-- Name: goal_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.goal_status AS ENUM (
    'active',
    'completed',
    'cancelled'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'paid',
    'overdue'
);


--
-- Name: project_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_status AS ENUM (
    'active',
    'paused',
    'completed',
    'archived'
);


--
-- Name: transaction_frequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_frequency AS ENUM (
    'once',
    'daily',
    'weekly',
    'monthly',
    'yearly'
);


--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_type AS ENUM (
    'income',
    'expense'
);


--
-- Name: calculate_monthly_bills_stats(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_monthly_bills_stats(p_user_id uuid, p_month integer, p_year integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total_bills INTEGER;
  v_paid_bills INTEGER;
  v_total_amount DECIMAL(12, 2);
  v_paid_amount DECIMAL(12, 2);
  v_overdue_count INTEGER;
BEGIN
  -- Verify authorization: Only allow querying own data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: You can only view your own bill statistics';
  END IF;

  -- Contar total de contas
  SELECT COUNT(*) INTO v_total_bills
  FROM fixed_bills
  WHERE user_id = p_user_id AND auto_repeat = TRUE;

  -- Contar contas pagas no mês
  SELECT COUNT(DISTINCT bp.bill_id) INTO v_paid_bills
  FROM bill_payments bp
  WHERE bp.user_id = p_user_id
    AND EXTRACT(MONTH FROM bp.payment_date) = p_month
    AND EXTRACT(YEAR FROM bp.payment_date) = p_year;

  -- Calcular valor total mensal
  SELECT COALESCE(SUM(amount), 0) INTO v_total_amount
  FROM fixed_bills
  WHERE user_id = p_user_id AND auto_repeat = TRUE;

  -- Calcular valor pago no mês
  SELECT COALESCE(SUM(amount_paid), 0) INTO v_paid_amount
  FROM bill_payments
  WHERE user_id = p_user_id
    AND EXTRACT(MONTH FROM payment_date) = p_month
    AND EXTRACT(YEAR FROM payment_date) = p_year;

  -- Contar contas atrasadas
  SELECT COUNT(*) INTO v_overdue_count
  FROM fixed_bills
  WHERE user_id = p_user_id
    AND status = 'overdue'
    AND auto_repeat = TRUE;

  RETURN jsonb_build_object(
    'total_bills', v_total_bills,
    'paid_bills', v_paid_bills,
    'total_amount', v_total_amount,
    'paid_amount', v_paid_amount,
    'pending_amount', v_total_amount - v_paid_amount,
    'overdue_count', v_overdue_count,
    'completion_percentage', CASE 
      WHEN v_total_bills > 0 THEN (v_paid_bills::FLOAT / v_total_bills::FLOAT * 100)
      ELSE 0
    END
  );
END;
$$;


--
-- Name: calculate_project_progress(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_project_progress(p_project_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total_income DECIMAL(12, 2);
  v_total_expense DECIMAL(12, 2);
  v_target DECIMAL(12, 2);
  v_progress DECIMAL(5, 2);
  v_user_id UUID;
BEGIN
  -- Verify ownership: Check if the project belongs to the authenticated user
  SELECT user_id INTO v_user_id FROM projects WHERE id = p_project_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;
  
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: You do not own this project';
  END IF;

  -- Buscar meta do projeto
  SELECT target_amount INTO v_target
  FROM projects
  WHERE id = p_project_id;

  -- Calcular entradas do projeto
  SELECT COALESCE(SUM(amount), 0) INTO v_total_income
  FROM transactions
  WHERE project_id = p_project_id AND type = 'income';

  -- Calcular saídas do projeto
  SELECT COALESCE(SUM(amount), 0) INTO v_total_expense
  FROM transactions
  WHERE project_id = p_project_id AND type = 'expense';

  -- Calcular progresso
  IF v_target IS NOT NULL AND v_target > 0 THEN
    v_progress := ((v_total_income - v_total_expense) / v_target) * 100;
  ELSE
    v_progress := 0;
  END IF;

  RETURN jsonb_build_object(
    'total_income', v_total_income,
    'total_expense', v_total_expense,
    'net_amount', v_total_income - v_total_expense,
    'target', v_target,
    'progress', LEAST(v_progress, 100)
  );
END;
$$;


--
-- Name: create_default_categories(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_categories(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Categorias de Entrada
  INSERT INTO categories (user_id, name, icon, color, type) VALUES
    (p_user_id, 'Salário', 'Briefcase', '#10b981', 'income'),
    (p_user_id, 'Freelance', 'Code', '#059669', 'income'),
    (p_user_id, 'Investimentos', 'TrendingUp', '#34d399', 'income'),
    (p_user_id, 'Outros', 'DollarSign', '#6ee7b7', 'income');

  -- Categorias de Saída
  INSERT INTO categories (user_id, name, icon, color, type) VALUES
    (p_user_id, 'Alimentação', 'UtensilsCrossed', '#ef4444', 'expense'),
    (p_user_id, 'Transporte', 'Car', '#dc2626', 'expense'),
    (p_user_id, 'Moradia', 'Home', '#f87171', 'expense'),
    (p_user_id, 'Saúde', 'Heart', '#fb923c', 'expense'),
    (p_user_id, 'Educação', 'GraduationCap', '#fbbf24', 'expense'),
    (p_user_id, 'Lazer', 'Gamepad2', '#a855f7', 'expense'),
    (p_user_id, 'Compras', 'ShoppingBag', '#ec4899', 'expense'),
    (p_user_id, 'Contas', 'FileText', '#6b7280', 'expense'),
    (p_user_id, 'Outros', 'MoreHorizontal', '#9ca3af', 'expense');
END;
$$;


--
-- Name: create_default_categories_in_workspace(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_categories_in_workspace(p_user_id uuid, p_workspace_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Categorias de Entrada
  INSERT INTO categories (user_id, workspace_id, name, icon, color, type) VALUES
    (p_user_id, p_workspace_id, 'Salário', 'Briefcase', '#10b981', 'income'),
    (p_user_id, p_workspace_id, 'Freelance', 'Code', '#059669', 'income'),
    (p_user_id, p_workspace_id, 'Investimentos', 'TrendingUp', '#34d399', 'income'),
    (p_user_id, p_workspace_id, 'Outros', 'DollarSign', '#6ee7b7', 'income');

  -- Categorias de Saída
  INSERT INTO categories (user_id, workspace_id, name, icon, color, type) VALUES
    (p_user_id, p_workspace_id, 'Alimentação', 'UtensilsCrossed', '#ef4444', 'expense'),
    (p_user_id, p_workspace_id, 'Transporte', 'Car', '#dc2626', 'expense'),
    (p_user_id, p_workspace_id, 'Moradia', 'Home', '#f87171', 'expense'),
    (p_user_id, p_workspace_id, 'Saúde', 'Heart', '#fb923c', 'expense'),
    (p_user_id, p_workspace_id, 'Educação', 'GraduationCap', '#fbbf24', 'expense'),
    (p_user_id, p_workspace_id, 'Lazer', 'Gamepad2', '#a855f7', 'expense'),
    (p_user_id, p_workspace_id, 'Compras', 'ShoppingBag', '#ec4899', 'expense'),
    (p_user_id, p_workspace_id, 'Contas', 'FileText', '#6b7280', 'expense'),
    (p_user_id, p_workspace_id, 'Outros', 'MoreHorizontal', '#9ca3af', 'expense');
END;
$$;


--
-- Name: create_default_workspace(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_workspace() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Criar workspace padrão "Pessoal"
  INSERT INTO public.workspaces (user_id, name, description, color, icon, is_default)
  VALUES (NEW.id, 'Pessoal', 'Workspace padrão', '#6366F1', 'User', true);
  
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  default_workspace_id UUID;
BEGIN
  -- Criar perfil
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Criar workspace padrão e pegar o ID
  INSERT INTO public.workspaces (user_id, name, description, color, icon, is_default)
  VALUES (NEW.id, 'Pessoal', 'Workspace padrão', '#6366F1', 'User', true)
  RETURNING id INTO default_workspace_id;
  
  -- Criar categorias padrão no workspace
  PERFORM create_default_categories_in_workspace(NEW.id, default_workspace_id);
  
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: bill_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bill_id uuid NOT NULL,
    user_id uuid NOT NULL,
    payment_date date NOT NULL,
    amount_paid numeric(12,2) NOT NULL,
    notes text,
    receipt_url text,
    created_at timestamp with time zone DEFAULT now(),
    workspace_id uuid
);


--
-- Name: budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    project_id uuid,
    client_name text NOT NULL,
    client_email text,
    client_phone text,
    title text NOT NULL,
    description text,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    discount numeric(12,2) DEFAULT 0,
    total numeric(12,2) NOT NULL,
    valid_until date,
    terms text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    workspace_id uuid
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    icon text,
    color text,
    type public.transaction_type NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    workspace_id uuid
);


--
-- Name: daily_cash_closures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_cash_closures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    closure_date date NOT NULL,
    total_cash numeric(12,2) NOT NULL,
    total_card numeric(12,2) NOT NULL,
    total_pix numeric(12,2) NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    entries_count integer NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: daily_cash_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_cash_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    description text,
    category_id uuid,
    payment_method text DEFAULT 'cash'::text,
    entry_date date DEFAULT CURRENT_DATE NOT NULL,
    entry_time time without time zone DEFAULT CURRENT_TIME NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: fixed_bills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fixed_bills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category_id uuid,
    name text NOT NULL,
    description text,
    amount numeric(12,2) NOT NULL,
    due_day integer NOT NULL,
    frequency public.bill_frequency DEFAULT 'monthly'::public.bill_frequency,
    status public.payment_status DEFAULT 'pending'::public.payment_status,
    auto_repeat boolean DEFAULT true,
    notify_before_days integer DEFAULT 3,
    receipt_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    workspace_id uuid,
    CONSTRAINT fixed_bills_due_day_check CHECK (((due_day >= 1) AND (due_day <= 31)))
);


--
-- Name: folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    icon text,
    color text DEFAULT '#6366f1'::text,
    description text,
    parent_folder_id uuid,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    workspace_id uuid
);


--
-- Name: goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    project_id uuid,
    category_id uuid,
    name text NOT NULL,
    description text,
    target_amount numeric(12,2) NOT NULL,
    current_amount numeric(12,2) DEFAULT 0,
    period public.goal_period DEFAULT 'monthly'::public.goal_period,
    start_date date NOT NULL,
    end_date date,
    status public.goal_status DEFAULT 'active'::public.goal_status,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    workspace_id uuid
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    folder_id uuid,
    name text NOT NULL,
    description text,
    color text DEFAULT '#8b5cf6'::text,
    icon text,
    status public.project_status DEFAULT 'active'::public.project_status,
    target_amount numeric(12,2),
    tags text[],
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    workspace_id uuid
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category_id uuid,
    type public.transaction_type NOT NULL,
    amount numeric(12,2) NOT NULL,
    description text NOT NULL,
    date date NOT NULL,
    notes text,
    is_recurring boolean DEFAULT false,
    frequency public.transaction_frequency,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    project_id uuid,
    receipt_url text,
    workspace_id uuid
);


--
-- Name: workspaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    color text DEFAULT '#6366F1'::text,
    icon text DEFAULT 'Briefcase'::text,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bill_payments bill_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_payments
    ADD CONSTRAINT bill_payments_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_user_id_name_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_user_id_name_type_key UNIQUE (user_id, name, type);


--
-- Name: daily_cash_closures daily_cash_closures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_cash_closures
    ADD CONSTRAINT daily_cash_closures_pkey PRIMARY KEY (id);


--
-- Name: daily_cash_entries daily_cash_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_cash_entries
    ADD CONSTRAINT daily_cash_entries_pkey PRIMARY KEY (id);


--
-- Name: fixed_bills fixed_bills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_bills
    ADD CONSTRAINT fixed_bills_pkey PRIMARY KEY (id);


--
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- Name: goals goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: workspaces workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);


--
-- Name: idx_bill_payments_bill; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_payments_bill ON public.bill_payments USING btree (bill_id);


--
-- Name: idx_bill_payments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_payments_date ON public.bill_payments USING btree (payment_date);


--
-- Name: idx_bill_payments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_payments_user ON public.bill_payments USING btree (user_id);


--
-- Name: idx_bill_payments_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_payments_workspace ON public.bill_payments USING btree (workspace_id);


--
-- Name: idx_budgets_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_user ON public.budgets USING btree (user_id);


--
-- Name: idx_budgets_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_workspace ON public.budgets USING btree (workspace_id);


--
-- Name: idx_categories_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_user ON public.categories USING btree (user_id);


--
-- Name: idx_categories_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_workspace ON public.categories USING btree (workspace_id);


--
-- Name: idx_closures_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_closures_user_date ON public.daily_cash_closures USING btree (user_id, closure_date DESC);


--
-- Name: idx_closures_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_closures_workspace ON public.daily_cash_closures USING btree (workspace_id);


--
-- Name: idx_daily_cash_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_cash_user_date ON public.daily_cash_entries USING btree (user_id, entry_date DESC);


--
-- Name: idx_daily_cash_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_cash_workspace ON public.daily_cash_entries USING btree (workspace_id);


--
-- Name: idx_fixed_bills_due_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fixed_bills_due_day ON public.fixed_bills USING btree (due_day);


--
-- Name: idx_fixed_bills_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fixed_bills_user ON public.fixed_bills USING btree (user_id);


--
-- Name: idx_fixed_bills_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fixed_bills_workspace ON public.fixed_bills USING btree (workspace_id);


--
-- Name: idx_folders_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_folders_user ON public.folders USING btree (user_id);


--
-- Name: idx_folders_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_folders_workspace ON public.folders USING btree (workspace_id);


--
-- Name: idx_goals_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goals_project ON public.goals USING btree (project_id);


--
-- Name: idx_goals_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goals_user ON public.goals USING btree (user_id);


--
-- Name: idx_goals_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goals_workspace ON public.goals USING btree (workspace_id);


--
-- Name: idx_projects_folder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_folder ON public.projects USING btree (folder_id);


--
-- Name: idx_projects_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_user ON public.projects USING btree (user_id);


--
-- Name: idx_projects_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_workspace ON public.projects USING btree (workspace_id);


--
-- Name: idx_transactions_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_category ON public.transactions USING btree (category_id);


--
-- Name: idx_transactions_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_project ON public.transactions USING btree (project_id);


--
-- Name: idx_transactions_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_user_date ON public.transactions USING btree (user_id, date DESC);


--
-- Name: idx_transactions_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_workspace ON public.transactions USING btree (workspace_id);


--
-- Name: idx_workspaces_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspaces_default ON public.workspaces USING btree (user_id, is_default) WHERE (is_default = true);


--
-- Name: idx_workspaces_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspaces_user_id ON public.workspaces USING btree (user_id);


--
-- Name: budgets update_budgets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: fixed_bills update_fixed_bills_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_fixed_bills_updated_at BEFORE UPDATE ON public.fixed_bills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: folders update_folders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: goals update_goals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: projects update_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: transactions update_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workspaces update_workspaces_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bill_payments bill_payments_bill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_payments
    ADD CONSTRAINT bill_payments_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.fixed_bills(id) ON DELETE CASCADE;


--
-- Name: bill_payments bill_payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_payments
    ADD CONSTRAINT bill_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: bill_payments bill_payments_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_payments
    ADD CONSTRAINT bill_payments_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: budgets budgets_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: budgets budgets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: budgets budgets_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: categories categories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: categories categories_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: daily_cash_closures daily_cash_closures_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_cash_closures
    ADD CONSTRAINT daily_cash_closures_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: daily_cash_closures daily_cash_closures_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_cash_closures
    ADD CONSTRAINT daily_cash_closures_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: daily_cash_entries daily_cash_entries_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_cash_entries
    ADD CONSTRAINT daily_cash_entries_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: daily_cash_entries daily_cash_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_cash_entries
    ADD CONSTRAINT daily_cash_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: daily_cash_entries daily_cash_entries_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_cash_entries
    ADD CONSTRAINT daily_cash_entries_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: fixed_bills fixed_bills_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_bills
    ADD CONSTRAINT fixed_bills_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: fixed_bills fixed_bills_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_bills
    ADD CONSTRAINT fixed_bills_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: fixed_bills fixed_bills_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_bills
    ADD CONSTRAINT fixed_bills_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: folders folders_parent_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_parent_folder_id_fkey FOREIGN KEY (parent_folder_id) REFERENCES public.folders(id) ON DELETE CASCADE;


--
-- Name: folders folders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: folders folders_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: goals goals_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: goals goals_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: goals goals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: goals goals_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: projects projects_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folders(id) ON DELETE SET NULL;


--
-- Name: projects projects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: projects projects_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspaces workspaces_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: fixed_bills Users can delete own bills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own bills" ON public.fixed_bills FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: budgets Users can delete own budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own budgets" ON public.budgets FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: daily_cash_entries Users can delete own cash entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own cash entries" ON public.daily_cash_entries FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: categories Users can delete own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own categories" ON public.categories FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: folders Users can delete own folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own folders" ON public.folders FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: goals Users can delete own goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own goals" ON public.goals FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: bill_payments Users can delete own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own payments" ON public.bill_payments FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: projects Users can delete own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: transactions Users can delete own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: workspaces Users can delete own workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own workspaces" ON public.workspaces FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: fixed_bills Users can insert own bills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own bills" ON public.fixed_bills FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: budgets Users can insert own budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own budgets" ON public.budgets FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: daily_cash_entries Users can insert own cash entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own cash entries" ON public.daily_cash_entries FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: categories Users can insert own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own categories" ON public.categories FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: daily_cash_closures Users can insert own closures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own closures" ON public.daily_cash_closures FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: folders Users can insert own folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own folders" ON public.folders FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: goals Users can insert own goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own goals" ON public.goals FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: bill_payments Users can insert own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own payments" ON public.bill_payments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: projects Users can insert own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own projects" ON public.projects FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: transactions Users can insert own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: workspaces Users can insert own workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own workspaces" ON public.workspaces FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: fixed_bills Users can update own bills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own bills" ON public.fixed_bills FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: budgets Users can update own budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own budgets" ON public.budgets FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: daily_cash_entries Users can update own cash entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own cash entries" ON public.daily_cash_entries FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: categories Users can update own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own categories" ON public.categories FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: folders Users can update own folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own folders" ON public.folders FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: goals Users can update own goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own goals" ON public.goals FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: bill_payments Users can update own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own payments" ON public.bill_payments FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: projects Users can update own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: transactions Users can update own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: workspaces Users can update own workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own workspaces" ON public.workspaces FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: fixed_bills Users can view own bills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own bills" ON public.fixed_bills FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: budgets Users can view own budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own budgets" ON public.budgets FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: daily_cash_entries Users can view own cash entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own cash entries" ON public.daily_cash_entries FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: categories Users can view own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own categories" ON public.categories FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: daily_cash_closures Users can view own closures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own closures" ON public.daily_cash_closures FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: folders Users can view own folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own folders" ON public.folders FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: goals Users can view own goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own goals" ON public.goals FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: bill_payments Users can view own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own payments" ON public.bill_payments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: projects Users can view own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: transactions Users can view own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: workspaces Users can view own workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own workspaces" ON public.workspaces FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: bill_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: budgets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_cash_closures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_cash_closures ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_cash_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_cash_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: fixed_bills; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fixed_bills ENABLE ROW LEVEL SECURITY;

--
-- Name: folders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

--
-- Name: goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: workspaces; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


