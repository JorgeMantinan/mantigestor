/**
 * Guía práctica fiscal — explicaciones en lenguaje llano para cada campo de las calculadoras.
 * Sin IA, sin coste. Datos estáticos verificados contra AEAT.
 */

export interface GuiaCampo {
  titulo: string
  contenido: string
  ejemplos?: string[]
  dondeVer?: string
}

export const GUIA_IRPF: Record<string, GuiaCampo> = {
  trabajo: {
    titulo: 'Rendimientos netos del trabajo',
    contenido: 'Es el dinero que recibes por trabajar para alguien (nómina, pensiones, desempleo). Se calcula sumando tu salario bruto anual y restando las cuotas de Seguridad Social que pagas tú. NO incluye las retenciones de IRPF que te retiene tu empresa (esas van en "Pagos a cuenta").',
    ejemplos: [
      'Si tu nómina dice 30.000€ brutos y pagas 2.000€ de Seguridad Social, pon 28.000€',
      'Una pensión de 1.200€/mes → 14.400€ anuales',
      'El paro (prestación por desempleo) también cuenta aquí',
      'Una indemnización por despido NO se incluye (está exenta)',
    ],
    dondeVer: 'En tu nómina: línea "Base de cotización por contingencias comunes" o "Salario bruto anual". En el caso de pensiones y paro, en la certificadora anual de la AEAT (Renta-web).',
  },

  actividades: {
    titulo: 'Actividades económicas netas',
    contenido: 'Es el dinero que ganas por tu propio trabajo como autónomo o por una actividad empresarial (facturar a clientes). Se calcula: facturas emitidas – gastos deducibles. NO es lo mismo que tu nómina.',
    ejemplos: [
      'Si eres diseñador freelance y facturas 40.000€ con 8.000€ de gastos, pon 32.000€',
      'Si tienes una tienda online y ganas 15.000€ netos, pon 15.000€',
      'NO incluyas aquí el alquiler de un piso (eso va en "Ahorro")',
      'NO incluyas tu nómina (eso va en "Rendimientos del trabajo")',
      'Si trabajas por cuenta ajena Y facturas algo extra, pon aquí solo lo extra',
    ],
    dondeVer: 'En tu declaración de la renta del año anterior (casilla 24 o 158 de la Renta 2025). Si es tu primer año, calcula: facturas emitidas – gastos (alquiler local, material, seguros, etc.).',
  },

  ahorro: {
    titulo: 'Base liquidable del ahorro',
    contenido: 'Es todo el dinero que obtienes sin trabajar directamente: alquileres de pisos, intereses del banco, dividendos de acciones, ganancias al vender acciones o criptomonedas. Se tributa por separado con una escala específica.',
    ejemplos: [
      'Alquiler de un piso: 800€/mes × 12 = 9.600€ brutos',
      'Intereses de una cuenta de ahorro: 500€',
      'Dividendos de acciones: 1.200€',
      'Ganancia al vender acciones: 3.000€',
      'Si el alquiler es de tu vivienda habitual, NO cuenta (está exento)',
    ],
    dondeVer: 'Certificados de retenciones de tu banco (intereses, dividendos). Contrato de alquiler y recibos de Transferencia Bancaria. Tu bróker te da un certificado anual de ganancias/pérdidas.',
  },

  deduccionesManuales: {
    titulo: 'Deducciones que puedas tener',
    contenido: 'Son reducciones que se restan directamente de la cuota que pagarías. Solo pon aquí deducciones que no se calculan automáticamente (como las deducciones autonómicas que ya calcula esta herramienta).',
    ejemplos: [
      'En la mayoría de casos, deja esto en 0€',
      'Si donaste dinero a ONGs y no lo metiste en la declaración automática',
      'Si pagaste gastos de guardería y no los incluiste',
    ],
    dondeVer: 'Si no estás seguro, déjalo en 0. La herramienta ya calcula las deducciones autonómicas principales.',
  },

  pagosACuenta: {
    titulo: 'Retenciones y pagos fraccionados',
    contenido: 'Es el dinero que te han retenido de tu nómina o que has pagado por adelantado a Hacienda a lo largo del año. Se resta al final para saber si te devuelven o si debes pagar.',
    ejemplos: [
      'En tu nómina: la casilla "Retención IRPF" × 12 nóminas',
      'Si eres autónomo: los pagos fraccionados trimestrales (modelos 130/131)',
      'Si alquilas un piso: el 19% que retiene tu inquilino',
    ],
    dondeVer: 'En tu nómina: línea "Retención IRPF". En tu banco: retenciones de intereses/dividendos. Si eres autónomo: resúmenes de los pagos trimestrales.',
  },

  edad: {
    titulo: 'Edad del contribuyente',
    contenido: 'La edad a 31 de diciembre del año fiscal. Affects the mínimo personal y familiar (más edad = más mínimo = menos impuestos).',
    ejemplos: [
      'Si cumpliste 66 años en 2025, selecciona "Entre 65 y 75"',
      'Si tienes 64 a 31/12/2025, selecciona "Menos de 65"',
    ],
    dondeVer: 'Tu fecha de nacimiento. Se usa la edad a 31 de diciembre del ejercicio.',
  },

  hijos: {
    titulo: 'Número de hijos',
    contenido: 'Hijos o hijos reconocidos legalmente. Cada hijo da derecho a un mínimo personal que reduce la base imponible. Hay mínimos adicionales si son menores de 3 años o tienen discapacidad.',
    ejemplos: [
      'Si tienes 2 hijos, pon 2',
      'Si tus hijos son tuyos y de tu pareja, cuenta el número total',
      'Los hijos mayores de 25 que viven contigo también cuentan (si no tienen rentas)',
    ],
    dondeVer: 'En tu libro de familia o en la certificadora de la AEAT del año anterior.',
  },

  menores3: {
    titulo: 'De ellos, menores de 3 años',
    contenido: 'De los hijos que pusiste antes, cuántos tenían menos de 3 años a 31 de diciembre del año fiscal. Dan un mínimo adicional.',
    dondeVer: 'Calcula la edad de cada hijo a 31 de diciembre del año fiscal.',
  },

  ascendientes: {
    titulo: 'Ascendientes a cargo',
    contenido: 'Tus padres, abuelos u otros ascendientes que viven contigo y cuyos rendimientos son inferiores a 8.000€/año. Cada uno da derecho a un mínimo adicional.',
    ejemplos: [
      'Tu madre de 70 años que vive contigo y cobra 6.000€ de pensión → cuenta',
      'Tu padre de 60 que trabaja y gana 20.000€ → NO cuenta',
    ],
    dondeVer: 'Deben convivir contigo al menos la mitad del año y no tener rendimientos superiores a 8.000€.',
  },

  conyuge: {
    titulo: 'Cónyuge a cargo',
    contenido: 'Tu pareja (casada o con pareja de hecho registrada) que vive contigo y cuyos rendimientos son inferiores a 8.000€/año. Si cumple las condiciones, da un mínimo adicional.',
    dondeVer: 'Casilla 623 de la Renta. Debe convivir contigo y no tener rendimientos superiores a 8.000€.',
  },

  monoparental: {
    titulo: 'Familia monoparental',
    contenido: 'Si eres el único progenitor que convive con tus hijos (el otro progenitor no vive en el domicilio o ha fallecido). Te da derecho a multiplicar el mínimo por hijos × 1,5.',
    dondeVer: 'Casilla 625 de la Renta. Debes ser el único progenitor que convive con los hijos.',
  },
}

export const GUIA_IVA: Record<string, GuiaCampo> = {
  tipoIva: {
    titulo: 'Tipo de IVA',
    contenido: 'El IVA es un impuesto que añades al precio de tus facturas y luego pagas a Hacienda. El tipo depende de lo que vendas.',
    ejemplos: [
      'General (21%): la mayoría de productos y servicios (ropa, electrónica, consultoría)',
      'Reducido (10%): alimentos básicos, viviendas, hostelería, transporte',
      'Superreducido (4%): pan, leche, libros, medicamentos',
      'Exento: sanidad, educación, seguros (no cobras IVA)',
    ],
    dondeVer: 'En tu factura: busca la línea "IVA" o "% IVA". Si no lo sabes, el tipo general (21%) es el más habitual para autónomos que prestan servicios.',
  },

  importeIva: {
    titulo: 'Importe base / con IVA',
    contenido: 'Si seleccionas "Añadir IVA", pon el precio sin IVA y la herramienta calcula cuánto añadir. Si seleccionas "Extraer IVA", pon el total con IVA incluido y te dice cuánto era el IVA.',
    ejemplos: [
      'Factura de 1.000€ + 21% IVA → total 1.210€. Pon 1.000€ en "Añadir"',
      'Recibo de 1.210€ con IVA → base era 1.000€. Pon 1.210€ en "Extraer"',
    ],
  },
}

export const GUIA_RETA: Record<string, GuiaCampo> = {
  rendimientoReta: {
    titulo: 'Rendimiento neto mensual',
    contenido: 'Es lo que ganas como autónomo después de restar los gastos de tu actividad. Se calcula: facturas emitidas – gastos deducibles (alquiler local, material, seguros, suministros, etc.) – cuotas de autónomo. Es la cifra que usas para calcular tu cuota mensual.',
    ejemplos: [
      'Si facturas 3.000€/mes y tus gastos son 800€, tu rendimiento neto es 2.200€',
      'Si facturas 1.500€/mes y tus gastos son 400€, pon 1.100€',
      'Si estás empezando y facturas poco, pon lo que realmente facturas menos gastos',
      'NO incluyas aquí las cuotas de autónomo que aún no has pagado',
    ],
    dondeVer: 'En tu modelo 130/131 (declaración trimestral): la casilla "Rendimiento neto". O calcula: suma de facturas del mes – suma de gastos del mes.',
  },
}

export const GUIA_IS: Record<string, GuiaCampo> = {
  tipoEntidad: {
    titulo: 'Tipo de entidad',
    contenido: 'El tipo de impuesto sobre Sociedades depende de tu tipo de empresa. La mayoría de pymes pagan el tipo reducido.',
    ejemplos: [
      'General: 25% — el tipo estándar para la mayoría de sociedades',
      'Pyme reducida: 23% — para empresas con cifra de negocios <1.000.000€',
      'Pyme nueva: 15% — primeros 2 años con actividad positiva',
      'Entidad de nueva creación: 15% — los 2 primeros años con beneficios',
    ],
    dondeVer: 'En tu escritura de constitución y en el modelo 200 (declaración del impuesto). Si no sabes cuál eres, usa el tipo general (25%).',
  },

  baseIs: {
    titulo: 'Base imponible',
    contenido: 'El beneficio de tu empresa antes de aplicar el impuesto. Se calcula: ingresos – gastos deducibles. Es lo que pones en la casilla 001 del modelo 200.',
    ejemplos: [
      'Si tu empresa facturó 200.000€ y tuvo 150.000€ de gastos, la base es 50.000€',
      'Si tuviste pérdidas, pon 0 (no pagas impuesto)',
    ],
    dondeVer: 'En tu cuenta de resultados o en la casilla 001 del modelo 200.',
  },
}

export const GUIA_PATRIMONIO: Record<string, GuiaCampo> = {
  patrimonioNeto: {
    titulo: 'Patrimonio neto',
    contenido: 'Es la suma de todos tus bienes y derechos MINUS tus deudas. Solo tributa si supera 700.000€ (mínimo exento estatal). Incluye viviendas, cuentas bancarias, acciones, fondos, joyas, coches (si superan cierto valor), etc.',
    ejemplos: [
      'Vivienda habitual: valor catastral o de compraventa',
      'Cuentas bancarias: saldo a 31 de diciembre',
      'Acciones/fondos: valor a 31 de diciembre',
      'RESTA: hipotecas, préstamos, deudas pendientes',
      'Si tu patrimonio neto es <700.000€, no pagarás nada (pero si supera 2.000.000€, debes declarar aunque la cuota sea 0)',
    ],
    dondeVer: 'Valor catastral de tus viviendas (en el IBI). Saldo de tus cuentas a 31/12. Valor de cartera de inversión. Tu hipoteca pendiente.',
  },
}

export const GUIA_DEDUCCIONES: Record<string, GuiaCampo> = {
  hijosDeducciones: {
    titulo: 'Hijos (para deducciones autonómicas)',
    contenido: 'El número de hijos determina qué deducciones puedes aplicar. Cada comunidad autónoma tiene sus propias deducciones por hijos, y los importes varían mucho.',
    ejemplos: [
      'Madrid: 721,70€ por hijo en nacimiento/adopción',
      'Valencia: 600€ primer hijo, 750€ segundo, 900€ tercero+',
      'Galicia: 360€ primer hijo, 1.200€ segundo, 2.400€ tercero+',
      'Andalucía: 200€ por hijo (400€ en municipios pequeños)',
    ],
    dondeVer: 'Selecciona tu comunidad autónoma arriba y ve a la pestaña "Deducciones autonómicas".',
  },
}

export function obtenerGuia(seccion: string, campo: string): GuiaCampo | null {
  const guias: Record<string, Record<string, GuiaCampo>> = {
    irpf: GUIA_IRPF,
    iva: GUIA_IVA,
    reta: GUIA_RETA,
    is: GUIA_IS,
    patrimonio: GUIA_PATRIMONIO,
    deducciones: GUIA_DEDUCCIONES,
  }
  return guias[seccion]?.[campo] ?? null
}
