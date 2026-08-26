-- GRANTs para tablas fiscales (lectura pública autenticada, escritura solo service_role)
-- Ejecutar con: pnpm --filter=database exec -- dotenv -e ../../.env.local -- prisma db execute --file prisma/fiscal-grants.sql

GRANT SELECT ON public.fiscal_sources TO anon, authenticated, service_role;
GRANT SELECT ON public.jurisdicciones TO anon, authenticated, service_role;
GRANT SELECT ON public.administraciones TO anon, authenticated, service_role;
GRANT SELECT ON public.estados_verificacion TO anon, authenticated, service_role;
GRANT SELECT ON public.auditoria_correcciones TO anon, authenticated, service_role;
GRANT SELECT ON public.tax_models TO anon, authenticated, service_role;
GRANT SELECT ON public.fiscal_rates TO anon, authenticated, service_role;
GRANT SELECT ON public.irpf_tramos_estatales TO anon, authenticated, service_role;
GRANT SELECT ON public.irpf_tramos_autonomicos TO anon, authenticated, service_role;
GRANT SELECT ON public.reta_tramos TO anon, authenticated, service_role;
GRANT SELECT ON public.cotizaciones_seg_social TO anon, authenticated, service_role;
GRANT SELECT ON public.is_tipos TO anon, authenticated, service_role;
GRANT SELECT ON public.deadlines TO anon, authenticated, service_role;
GRANT SELECT ON public.vat_rules TO anon, authenticated, service_role;
GRANT SELECT ON public.minimo_personal_familiar TO anon, authenticated, service_role;
GRANT SELECT ON public.reducciones_generales_irpf TO anon, authenticated, service_role;
GRANT SELECT ON public.isd_reglas TO anon, authenticated, service_role;
GRANT SELECT ON public.itp_ajd_reglas TO anon, authenticated, service_role;
GRANT SELECT ON public.patrimonio_escala_estatal TO anon, authenticated, service_role;
GRANT SELECT ON public.deducciones_autonomicas TO anon, authenticated, service_role;
GRANT SELECT ON public.patrimonio_bonificaciones TO anon, authenticated, service_role;
GRANT SELECT ON public.sanciones TO anon, authenticated, service_role;
GRANT SELECT ON public.amortizacion_dietas_km TO anon, authenticated, service_role;
GRANT SELECT ON public.umbrales_tamano_empresa TO anon, authenticated, service_role;
GRANT SELECT ON public.reglas_territoriales TO anon, authenticated, service_role;
GRANT SELECT ON public.import_log TO service_role;
GRANT SELECT ON public.data_quality_errors TO service_role;
