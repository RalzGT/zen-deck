-- ============================================================================
-- ZEN DECK - MIGRACIONES DE LAYOUT POR DISPOSITIVO, DELTA SYNC Y BLINDAJE RLS
-- ============================================================================

-- 1. Layouts independientes por dispositivo en profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS layout_desktop jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS layout_mobile jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Función genérica para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.zen_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. Asegurar updated_at + trigger en todas las tablas sincronizadas
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles',
    'finance_accounts',
    'finance_transactions',
    'finance_categories',
    'finance_planned',
    'todos',
    'reminders',
    'quick_links',
    'custom_widgets'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();', tbl);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.zen_set_updated_at();',
      tbl, tbl
    );
  END LOOP;
END $$;

-- 4. Activar y blindar Row Level Security (RLS) en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "zen_profiles_owner_all" ON public.profiles;
CREATE POLICY "zen_profiles_owner_all"
  ON public.profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'finance_accounts',
    'finance_transactions',
    'finance_categories',
    'finance_planned',
    'todos',
    'reminders',
    'quick_links',
    'custom_widgets'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "zen_%I_owner_all" ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "zen_%I_owner_all" ON public.%I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);',
      tbl, tbl
    );
  END LOOP;
END $$;