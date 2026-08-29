import type { PerfilFiscal } from './perfil'

export type SeccionKey = 'irpf' | 'iva' | 'reta' | 'sociedades' | 'patrimonio' | 'deducciones' | 'documentos' | 'modelo111' | 'modelo190' | 'modelo390' | 'modelo180' | 'modelo202' | 'modelo200' | 'modelo720' | 'modelo151' | 'modelo100' | 'modelo131' | 'modelo115' | 'modelo123' | 'modelo347' | 'modelo349' | 'modelo721' | 'modelo714' | 'modelo232' | 'modelo210' | 'modelo220' | 'modelo309' | 'modelo184' | 'modelo296' | 'modelo345' | 'modelo193' | 'modelo369' | 'modelo130' | 'modelo303' | 'modelo170' | 'modelo179' | 'modelo600' | 'modelo233' | 'modelo036' | 'modelo145' | 'modelo590' | 'modelo222' | 'modelo211' | 'modelo104' | 'plusvalia' | 'modelo110' | 'modelo117' | 'plazos' | 'minimos' | 'resumen' | 'packTrimestre' | 'presupuestoAnual' | 'guias'

export const SECCIONES_CALCULADORAS: Array<{ key: SeccionKey; label: string }> = [
  { key: 'irpf', label: 'IRPF' },
  { key: 'iva', label: 'IVA' },
  { key: 'reta', label: 'Autónomos (RETA)' },
  { key: 'sociedades', label: 'Sociedades' },
  { key: 'patrimonio', label: 'Patrimonio' },
  { key: 'deducciones', label: 'Deducciones autonómicas' },
  { key: 'documentos', label: 'Documentos IA' },
]

export const SECCIONES_MODELOS: Array<{ key: SeccionKey; label: string }> = [
  { key: 'modelo100', label: 'Modelo 100' },
  { key: 'modelo111', label: 'Modelo 111' },
  { key: 'modelo115', label: 'Modelo 115' },
  { key: 'modelo123', label: 'Modelo 123' },
  { key: 'modelo130', label: 'Modelo 130' },
  { key: 'modelo131', label: 'Modelo 131' },
  { key: 'modelo151', label: 'Modelo 151' },
  { key: 'modelo170', label: 'Modelo 170' },
  { key: 'modelo179', label: 'Modelo 179' },
  { key: 'modelo180', label: 'Modelo 180' },
  { key: 'modelo184', label: 'Modelo 184' },
  { key: 'modelo190', label: 'Modelo 190' },
  { key: 'modelo193', label: 'Modelo 193' },
  { key: 'modelo200', label: 'Modelo 200 (IS)' },
  { key: 'modelo202', label: 'Modelo 202' },
  { key: 'modelo210', label: 'Modelo 210' },
  { key: 'modelo220', label: 'Modelo 220' },
  { key: 'modelo232', label: 'Modelo 232' },
  { key: 'modelo233', label: 'Modelo 233' },
  { key: 'modelo296', label: 'Modelo 296' },
  { key: 'modelo303', label: 'Modelo 303 (IVA)' },
  { key: 'modelo309', label: 'Modelo 309' },
  { key: 'modelo345', label: 'Modelo 345' },
  { key: 'modelo347', label: 'Modelo 347' },
  { key: 'modelo349', label: 'Modelo 349' },
  { key: 'modelo369', label: 'Modelo 369' },
  { key: 'modelo390', label: 'Modelo 390' },
  { key: 'modelo600', label: 'Modelo 600 (ITP)' },
  { key: 'modelo714', label: 'Modelo 714' },
  { key: 'modelo720', label: 'Modelo 720' },
  { key: 'modelo721', label: 'Modelo 721' },
  { key: 'modelo036', label: 'Modelo 036/037 (alta censal)' },
  { key: 'modelo145', label: 'Modelo 145 (retención trabajo)' },
  { key: 'modelo590', label: 'Modelo 590 (operaciones vinculadas)' },
  { key: 'modelo222', label: 'Modelo 222 (pago fraccionado)' },
  { key: 'modelo211', label: 'Modelo 211 (no residentes, inmuebles)' },
  { key: 'modelo104', label: 'Modelo 104 (devolución acelerada)' },
  { key: 'plusvalia', label: 'Plusvalía municipal (IIVTNU)' },
  { key: 'modelo110', label: 'Modelo 110 (otras retenciones IRPF)' },
  { key: 'modelo117', label: 'Modelo 117 (agrícolas y ganaderas)' },
]

export const SECCIONES_UTILIDADES: Array<{ key: SeccionKey; label: string }> = [
  { key: 'guias', label: 'Guías' },
  { key: 'plazos', label: 'Calendario fiscal' },
  { key: 'minimos', label: 'Mínimos y reducciones' },
  { key: 'resumen', label: 'Resumen anual' },
  { key: 'packTrimestre', label: 'Pack de trimestre' },
  { key: 'presupuestoAnual', label: 'Presupuesto anual' },
]

export const COMUNIDADES = [
  'Andalucía', 'Aragón', 'Asturias (Principado de)', 'Illes Balears', 'Canarias',
  'Cantabria', 'Castilla y León', 'Castilla-La Mancha', 'Cataluña', 'Comunitat Valenciana',
  'Extremadura', 'Galicia', 'Madrid (Comunidad de)', 'Región de Murcia',
  'Navarra (Comunidad Foral de)', 'País Vasco - Álava', 'País Vasco - Bizkaia',
  'País Vasco - Gipuzkoa', 'La Rioja', 'Ceuta', 'Melilla',
]

export const PERFILES: Array<{ key: PerfilFiscal; label: string; seccionInicial: SeccionKey }> = [
  { key: 'autonomo', label: 'Autónomo / freelance', seccionInicial: 'reta' },
  { key: 'sociedad', label: 'Sociedad / SL', seccionInicial: 'sociedades' },
  { key: 'empleado', label: 'Empleado por cuenta ajena', seccionInicial: 'irpf' },
  { key: 'alquilador', label: 'Propietario con alquileres', seccionInicial: 'irpf' },
]

export const ETIQUETA_PERFIL: Record<PerfilFiscal, string> = {
  autonomo: 'Autónomo / freelance',
  sociedad: 'Sociedad / SL',
  empleado: 'Empleado por cuenta ajena',
  alquilador: 'Propietario con alquileres',
}
