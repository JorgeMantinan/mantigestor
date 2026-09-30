/**
 * Guías fiscales por perfil — Resúmenes prácticos de obligaciones y consejos
 * para cada tipo de contribuyente.
 */

export interface GuiaPerfil {
  titulo: string
  descripcion: string
  obligaciones: string[]
  consejos: string[]
  modelosRelevantes: string[]
}

export const GUIAS_PERFIL: Record<string, GuiaPerfil> = {
  autonomo: {
    titulo: 'Autónomo / Freelance',
    descripcion: 'Guía fiscal para autónomos y profesionales por cuenta propia.',
    obligaciones: [
      'Declaración censal (Modelo 036/037) si hay cambios en la actividad',
      'Modelo 130/131 trimestral (IRPF por módulos o estimación directa)',
      'Modelo 303 trimestral (IVA declarante)',
      'Modelo 111 trimestral (retenciones si facturas a empresas)',
      'Modelo 390 anual (resumen IVA)',
      'Modelo 190 anual (retenciones a terceros)',
      'Modelo 100 anual (Declaración de la Renta)',
      'Pago fraccionado trimestral del IRPF (20% del rendimiento neto acumulado)',
      'Cotización mensual a la Seguridad Social (RETA)',
      'Facturas electrónicas si superas los umbrales',
    ],
    consejos: [
      'Lleva una contabilidad ordenada — deduce todos los gastos deducibles',
      'Registra las facturas emitidas y recibidas en tiempo real',
      'No olvides los pagos fraccionados: el 20% del rendimiento neto acumulado en cada trimestre',
      'Para renunciar a módulos: modelo 036/037 antes del 31 de diciembre (compromiso de estimación directa 3 años)',
      'Guarda Justificantes de gastos al menos 4 años',
      'Consulta si tu comunidad autónoma ofrece bonificaciones en cuota RETA',
      'Deduce el 100% de la cuota RETA si estás en tarifa plana (primeros 12 meses)',
      'Si tienes trabajadores, lleva nóminas y el Modelo 111/190',
    ],
    modelosRelevantes: ['Modelo 130', 'Modelo 131', 'Modelo 303', 'Modelo 111', 'Modelo 100', 'Modelo 390', 'Modelo 190'],
  },

  sociedad: {
    titulo: 'Sociedad / SL',
    descripcion: 'Guía fiscal para sociedades mercantiles (SL, SA, etc.).',
    obligaciones: [
      'Impuesto sobre Sociedades (Modelo 200) — tipo general 25%',
      'Pagos fraccionados del IS (Modelo 202) — 18% de la cuota del año anterior, o 17%/24% sobre la base (obligatorio si facturas > 6 M€)',
      'Modelo 220 si grupo fiscal consolidado',
      'Modelo 232 si operaciones vinculadas',
      'Modelo 347 si operaciones con terceros >3.005,06€',
      'Modelo 349 si operaciones intracomunitarias',
      'Modelo 303 trimestral (IVA)',
      'Modelo 390 anual (resumen IVA)',
      'Contabilidad oficial y depósito de cuentas en el Registro Mercantil',
      'Certificado digital obligatorio para comunicaciones con Hacienda',
    ],
    consejos: [
      'Optimiza la fiscalidad: microempresas con beneficio < 1 M€ aplican tipo reducido (19% en 2026)',
      'Si eres empresa de nueva creación, tipo reducido 15% los 2 primeros años',
      'Gestiona las nóminas de empleados con retenciones IRPF (Modelo 111/190)',
      'Si tienes socios, planifica dividendos vs. salario',
      'Lleva registro de operaciones vinculadas si las hay',
      'Considera la deducción por I+D+i (25-42%)',
      'Presenta el balance y cuenta de pérdidas y ganancias anualmente',
      'Revisa el calendario fiscal para no perder plazos',
    ],
    modelosRelevantes: ['Modelo 200', 'Modelo 202', 'Modelo 220', 'Modelo 232', 'Modelo 303', 'Modelo 347', 'Modelo 349', 'Modelo 390'],
  },

  empleado: {
    titulo: 'Empleado por cuenta ajena',
    descripcion: 'Guía fiscal para asalariados con nómina fija o variable.',
    obligaciones: [
      'Declaración de la Renta anual (Modelo 100) — obligatoria si >22.000€ brutos de un pagador',
      'Si >15.000€ de dos pagadores: presentación obligatoria',
      'Modelo 190 anual (resumen de retenciones del empleador)',
      'Declaración de bienes en el extranjero (Modelo 720) si >50.000€',
    ],
    consejos: [
      'Revisa tu retención IRPF: si es muy alta, solicita ajuste en nómina',
      'Gastos deducibles del rendimiento del trabajo: 2.000 € generales y 1.500 € adicionales si te desplazas más de 100 km al trabajo (art. 19.2.f LIRPF).',
      'Invierte en planes de pensiones: reducen la base imponible hasta 1.500 €/año (o el 30% de tus rendimientos, el menor); con planes de empleo, hasta 10.000 €.',
      'Si tienes varios pagadores, la declaración puede salir a pagar',
      'Aprovecha deducciones por vivienda habitual si alquilas (<35 años)',
      'Guarda nóminas y certificado de retenciones del empleador',
      'Si cobras bonus, la retención será mayor ese mes — revisa en la renta',
      'No olvides las deducciones autonómicas de tu comunidad',
    ],
    modelosRelevantes: ['Modelo 100', 'Modelo 720'],
  },

  alquilador: {
    titulo: 'Propietario con alquileres',
    descripcion: 'Guía fiscal para propietarios que alquilan viviendas o locales.',
    obligaciones: [
      'Declarar los rendimientos del capital inmobiliario en la Renta (Modelo 100)',
      'Retenciones: arrendatarios con actividad económica retienen 19%',
      'Modelo 180 anual (resumen de retenciones sobre arrendamientos)',
      'Modelo 115 trimestral si arrendatarios son empresas',
      'Declaración de bienes en el extranjero (Modelo 720) si aplica',
    ],
    consejos: [
      'Deducibilidad de gastos: 50-60% del valor catastral (se aplica el mayor)',
      'Gastos deducibles: IBI, comunidad, seguros, intereses hipoteca, reparaciones',
      'Si el inquilino es empresa, la retención es 19% sobre renta bruta',
      'Declaración consolidada: puedes unir todos los inmuebles en la Renta',
      'Si el alquiler es turístico, aplica régimen especial (19% sobre rendimiento neto)',
      'Considera constituir una sociedad para alquileres si tienes varios pisos',
      'Deducción por vivienda habitual si la alquilas a menores de 35 años',
      'Guarda todos los justificantes de gastos y facturas de reparación',
    ],
    modelosRelevantes: ['Modelo 100', 'Modelo 180', 'Modelo 115'],
  },
}

export const PERFILES_DISPONIBLES = Object.keys(GUIAS_PERFIL)
