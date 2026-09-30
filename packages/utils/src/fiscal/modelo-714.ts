/**
 * Modelo 714 — Impuesto sobre el Patrimonio
 * Declaración anual: obligatoria con cuota a ingresar o si el patrimonio neto
 * supera los 700.000 € (y en todo caso con bienes por más de 2.000.000 €).
 *
 * Bonificación general de la cuota por CCAA (Ministerio de Hacienda,
 * «Tributación Autonómica. Medidas 2026», Cap. I): 100 % Madrid (2009),
 * Andalucía (2022), Extremadura (2023), Cantabria (2024) y La Rioja (2025);
 * 50 % Galicia; el resto sin bonificación general (Navarra y País Vasco: régimen
 * foral). Las bonificaciones del 99-100 % por parentesco son de Sucesiones y
 * Donaciones, no del Impuesto sobre el Patrimonio.
 */

export interface BienPatrimonio {
  tipo: string
  descripcion: string
  valor: number
  deudas: number
}

export interface DatosModelo714 {
  bienes: BienPatrimonio[]
  comunidadAutonoma: string
}

export interface ResultadoModelo714 {
  valorTotal: number
  deudas: number
  baseImponible: number
  obligatorio: boolean
  bonificacionAplicable: string
  porcentajeBonificacion: number
  /** Deducciones y bonificaciones aplicables: estatales (arts. 32-33 LIP) + las de la comunidad */
  deducciones: DeduccionAutonomicaIP[]
  resumen: string
}

const UMBRAL = 70_000_000 // 700.000€

const BONIFICACIONES: Record<string, { porcentaje: number; descripcion: string }> = {
  'Madrid': { porcentaje: 1, descripcion: 'Bonificación del 100% de la cuota (desde 2009)' },
  'Andalucía': { porcentaje: 1, descripcion: 'Bonificación del 100% de la cuota (desde 2022)' },
  'Extremadura': { porcentaje: 1, descripcion: 'Bonificación del 100% de la cuota (desde 2023)' },
  'Cantabria': { porcentaje: 1, descripcion: 'Bonificación del 100% de la cuota (desde 2024)' },
  'La Rioja': { porcentaje: 1, descripcion: 'Bonificación del 100% de la cuota (desde 2025)' },
  'Galicia': { porcentaje: 0.5, descripcion: 'Bonificación del 50% de la cuota' },
  'Aragón': { porcentaje: 0, descripcion: 'Sin bonificación general en cuota' },
  'Asturias': { porcentaje: 0, descripcion: 'Sin bonificación general en cuota' },
  'Canarias': { porcentaje: 0, descripcion: 'Sin bonificación general en cuota' },
  'Castilla y León': { porcentaje: 0, descripcion: 'Sin bonificación general en cuota' },
  'Castilla-La Mancha': { porcentaje: 0, descripcion: 'Sin bonificación general en cuota' },
  'Cataluña': { porcentaje: 0, descripcion: 'Sin bonificación general (tipos propios)' },
  'Islas Baleares': { porcentaje: 0, descripcion: 'Sin bonificación general en cuota' },
  'Murcia': { porcentaje: 0, descripcion: 'Sin bonificación general en cuota' },
  'Comunidad Valenciana': { porcentaje: 0, descripcion: 'Sin bonificación general en cuota' },
  'Navarra': { porcentaje: 0, descripcion: 'Régimen foral: se tributa por la normativa foral' },
  'País Vasco': { porcentaje: 0, descripcion: 'Régimen foral: se tributa por la normativa foral' },
  'Ceuta': { porcentaje: 0, descripcion: 'Sin bonificación general (aplica la bonificación estatal del art. 33 LIP por bienes en Ceuta y Melilla)' },
  'Melilla': { porcentaje: 0, descripcion: 'Sin bonificación general (aplica la bonificación estatal del art. 33 LIP por bienes en Ceuta y Melilla)' },
}

/**
 * Deducciones y bonificaciones del Impuesto sobre el Patrimonio (modelo 714).
 * Fuente: AEAT «Manual práctico de Patrimonio 2025» (cap. 5) y Ministerio de
 * Hacienda, «Tributación Autonómica. Medidas 2026» (Cap. I y Cap. IV).
 * Las dos primeras son ESTATALES (Ley 19/1991); el resto, específicas de cada CCAA.
 */
export interface DeduccionAutonomicaIP {
  ambito: 'estatal' | 'autonomico'
  titulo: string
  /** Cuantía: % sobre la cuota o la base, importe u otra fórmula */
  cuantia: string
  requisitos: string
}

const DEDUCCIONES_ESTATALES: DeduccionAutonomicaIP[] = [
  {
    ambito: 'estatal',
    titulo: 'Impuestos satisfechos en el extranjero (art. 32 LIP)',
    cuantia:
      'Minoración en el menor de: impuesto pagado en el extranjero, o (base imponible gravada allí × tipo medio de gravamen de este impuesto)',
    requisitos:
      'Obligación personal de contribuir por el mismo concepto; el tipo medio = cuota íntegra × 100 ÷ base liquidable; se calcula bien a bien y se suma en la casilla [41].',
  },
  {
    ambito: 'estatal',
    titulo: 'Bonificación de la cuota por bienes en Ceuta y Melilla (art. 33 LIP)',
    cuantia: '75 % de la parte de cuota proporcional a esos bienes',
    requisitos:
      'Residentes en Ceuta o Melilla; los no residentes, solo por valores de entidades allí domiciliadas o por establecimientos permanentes situados allí.',
  },
]

const ITSGF_TRANSITORIO: DeduccionAutonomicaIP = {
  ambito: 'autonomico',
  titulo: 'Régimen transitorio mientras esté vigente el ITSGF',
  cuantia:
    'La bonificación general se sustituye por la diferencia, si la hubiere, entre la cuota íntegra del IP (tras el límite del art. 31 LIP) y la cuota íntegra del ITSGF (art. 3.12 de la Ley 38/2022)',
  requisitos:
    'Contribuyentes incluidos en el Impuesto Temporal de Solidaridad de las Grandes Fortunas (patrimonio neto > 3.000.000 €) mientras dure dicho impuesto.',
}

const DEDUCCIONES_ESPECIFICAS: Record<string, DeduccionAutonomicaIP[]> = {
  'Madrid': [ITSGF_TRANSITORIO],
  'Andalucía': [ITSGF_TRANSITORIO],
  'Cantabria': [ITSGF_TRANSITORIO],
  'La Rioja': [ITSGF_TRANSITORIO],
  'Galicia': [
    {
      ambito: 'autonomico',
      titulo: 'Régimen transitorio del ITSGF sobre la bonificación del 50 %',
      cuantia:
        'Mientras dure el ITSGF, la bonificación del 50 % se reduce en el importe a pagar por este; si se agota, reduce las demás deducciones autonómicas',
      requisitos: 'Art. 13 quater / DT 3.ª TR D.Leg. 1/2011.',
    },
    {
      ambito: 'autonomico',
      titulo: 'Creación o ampliación de empresas de reciente creación',
      cuantia: '75 % de la parte proporcional de la cuota, con máximo de 4.000 € por sujeto pasivo',
      requisitos:
        'Bienes con deducción del IRPF por creación de empresas recientes o adquisición de acciones/participaciones; incompatible con la deducción por empresas agrarias y por centros históricos.',
    },
    {
      ambito: 'autonomico',
      titulo: 'Inversión en entidades agrarias, cooperativas, Sociedades de Fomento Forestal y recuperación de tierras',
      cuantia: '100 % de la parte proporcional de la cuota',
      requisitos:
        'Escritura pública con identidad e importe; mantenimiento 5 años (préstamo: vencimiento ≥ 5 años y amortización ≤ 20 % anual); incompatible con las exenciones del art. 4 LIP.',
    },
    {
      ambito: 'autonomico',
      titulo: 'Terrenos rústicos afectos a explotación agraria o cedidos en arrendamiento',
      cuantia: '100 % de la parte proporcional de la cuota',
      requisitos:
        'Inscritos en el Registro de Explotaciones Agrarias de Galicia y afectos (o arrendados) al menos la mitad del año natural del devengo.',
    },
    {
      ambito: 'autonomico',
      titulo: 'Inmuebles de centros históricos afectos a actividad económica',
      cuantia: '100 % de la parte proporcional de la cuota',
      requisitos:
        'Centros históricos de la orden; afectación a actividad económica ≥ la mitad del año; incompatible con las exenciones del art. 4 LIP.',
    },
    {
      ambito: 'autonomico',
      titulo: 'Participación en fondos propios de entidades que exploten inmuebles en centros históricos',
      cuantia: '100 % de la parte proporcional de la cuota',
      requisitos:
        'Solo la parte proporcional a los inmuebles del centro histórico menos sus deudas; afectos a actividad ≥ mitad del año; incompatible con las exenciones del art. 4 LIP.',
    },
    {
      ambito: 'autonomico',
      titulo: 'Adscripción a polígonos agroforestales, aldeas modelo o agrupaciones de gestión conjunta',
      cuantia: '100 % de la parte proporcional de la cuota',
      requisitos:
        'Adscripción mantenida ≥ 5 años e inscripción registral conforme a la Ley 11/2021 de recuperación de la tierra agraria.',
    },
  ],
  'Aragón': [
    {
      ambito: 'autonomico',
      titulo: 'Patrimonios especialmente protegidos de personas con discapacidad',
      cuantia: '99 % de la parte proporcional de la cuota (valor neto del patrimonio protegido hasta 300.000 €)',
      requisitos: 'Patrimonio protegido conforme a la Ley 41/2003 (art. 150-1 TR D.Leg. 1/2005).',
    },
  ],
  'Asturias': [
    {
      ambito: 'autonomico',
      titulo: 'Patrimonios especialmente protegidos de personas con discapacidad',
      cuantia: '99 % de la parte proporcional de la cuota minorada',
      requisitos: 'Patrimonio protegido conforme a la Ley 41/2003 (art. 16 TR D.Leg. 2/2014).',
    },
  ],
  'Cataluña': [
    {
      ambito: 'autonomico',
      titulo: 'Patrimonios protegidos de personas con discapacidad',
      cuantia: '99 % de la parte proporcional de la cuota minorada',
      requisitos:
        'Bienes constituidos al amparo de la Ley 41/2003 o de la Ley 25/2010 catalana (art. 622-1 Libro VI CCT).',
    },
    {
      ambito: 'autonomico',
      titulo: 'Bonificación de las propiedades forestales',
      cuantia: '95 % de la parte proporcional de la cuota (terreno y construcciones de utilidad exclusiva de la finca)',
      requisitos:
        'Instrumento de ordenación aprobado y vigente por la Administración forestal competente (art. 622-2).',
    },
  ],
  'Islas Baleares': [
    {
      ambito: 'autonomico',
      titulo: 'Bienes de consumo cultural',
      cuantia: '90 % de la parte proporcional de la cuota',
      requisitos:
        'Titularidad de pleno dominio de bienes de consumo cultural del art. 5 de la Ley 3/2015 (obras originales únicas o seriadas; excluidas artesanía y reproducciones).',
    },
  ],
  'Comunidad Valenciana': [
    {
      ambito: 'autonomico',
      titulo: 'Inversión en acciones/participaciones y préstamos a empresas emergentes',
      cuantia: '100 % de la parte proporcional de la cuota íntegra',
      requisitos:
        'Empresas emergentes de la C. Valenciana; acciones mantenidas ≥ 3 años; préstamo con vencimiento ≥ 3 años y amortización ≤ 40 % anual del principal (art. 9 bis Ley 13/1997, añadido por la Ley 3/2026).',
    },
  ],
  'Murcia': [
    ITSGF_TRANSITORIO,
    {
      ambito: 'autonomico',
      titulo: 'Aportaciones a proyectos de excepcional interés público regional',
      cuantia: '100 % del importe en dinero aportado',
      requisitos:
        'Aportación en dinero realizada en el año posterior al devengo, destinada a proyectos aprobados por el Consejo de Gobierno, con certificación de la entidad beneficiaria (art. 13 bis TR D.Leg. 1/2010).',
    },
  ],
  'Canarias': [
    {
      ambito: 'autonomico',
      titulo: 'Exención de bienes del patrimonio especialmente protegido con discapacidad',
      cuantia: 'Exención íntegra de esos bienes y derechos',
      requisitos:
        'Constituidos conforme a la Ley 41/2003 (art. 29-bis TR D.Leg. 1/2009). Canarias no ejerce otras competencias de deducción en este impuesto.',
    },
  ],
  'Castilla y León': [
    {
      ambito: 'autonomico',
      titulo: 'Exención de bienes del patrimonio especialmente protegido con discapacidad',
      cuantia: 'Exención íntegra de esos bienes y derechos',
      requisitos:
        'Conforme a la DA 2.ª de la Ley 41/2003 (art. 11 TR D.Leg. 1/2013). Castilla y León no ejerce otras competencias de deducción en este impuesto.',
    },
  ],
  'Castilla-La Mancha': [
    {
      ambito: 'autonomico',
      titulo: 'Sin competencias ejercidas en este impuesto',
      cuantia: 'Sin deducciones ni bonificaciones autonómicas propias',
      requisitos: 'Castilla-La Mancha no ha ejercido sus competencias normativas en el Impuesto sobre el Patrimonio.',
    },
  ],
  'Navarra': [
    {
      ambito: 'autonomico',
      titulo: 'Régimen foral',
      cuantia: 'El Impuesto sobre el Patrimonio se rige por la normativa foral de cada Territorio Histórico',
      requisitos: 'No consta en el manual de régimen común de la AEAT: consulta la normativa foral correspondiente.',
    },
  ],
  'País Vasco': [
    {
      ambito: 'autonomico',
      titulo: 'Régimen foral',
      cuantia: 'El Impuesto sobre el Patrimonio se rige por la normativa foral de cada Territorio Histórico',
      requisitos: 'No consta en el manual de régimen común de la AEAT: consulta la normativa foral correspondiente.',
    },
  ],
  'Extremadura': [
    {
      ambito: 'autonomico',
      titulo: 'Sin otras deducciones autonómicas',
      cuantia: 'Solo la bonificación general del 100 % de la cuota',
      requisitos: 'Art. 15 bis TR D.Leg. 1/2018; aplicable con posterioridad a las deducciones y bonificaciones estatales.',
    },
  ],
}

export const COMUNIDADES_AUTONOMAS = Object.keys(BONIFICACIONES).sort()

export function calcularModelo714(datos: DatosModelo714): ResultadoModelo714 {
  const { bienes, comunidadAutonoma } = datos

  const valorTotal = bienes.reduce((sum, b) => sum + b.valor, 0)
  const deudas = bienes.reduce((sum, b) => sum + b.deudas, 0)
  const baseImponible = Math.max(0, valorTotal - deudas)

  const obligatorio = baseImponible > UMBRAL

  const bonif = BONIFICACIONES[comunidadAutonoma]
  const bonificacionAplicable = bonif?.descripcion ?? 'Sin bonificación autonómica conocida'
  const porcentajeBonificacion = bonif?.porcentaje ?? 0
  const deducciones = [...DEDUCCIONES_ESTATALES, ...(DEDUCCIONES_ESPECIFICAS[comunidadAutonoma] ?? [])]

  const resumen = obligatorio
    ? `OBLIGATORIO: Base imponible (${formatEUR(baseImponible)}) supera el umbral de ${formatEUR(UMBRAL)}`
    : `No obligatorio. Base imponible: ${formatEUR(baseImponible)} (umbral: ${formatEUR(UMBRAL)})`

  return {
    valorTotal,
    deudas,
    baseImponible,
    obligatorio,
    bonificacionAplicable,
    porcentajeBonificacion,
    deducciones,
    resumen,
  }
}

function formatEUR(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}
