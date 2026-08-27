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

export const GUIA_MODELO_100: Record<string, GuiaCampo> = {
  baseImponible: {
    titulo: 'Base imponible del IRPF',
    contenido: 'Es la suma de tus rendimientos del trabajo, del capital y de actividades económicas, una vez aplicadas las reducciones. Es la cifra sobre la que se calcula el tipo impositivo.',
    ejemplos: [
      'Si ganas 30.000€ de nómina y 5.000€ de alquiler, tu base imponible será la suma de ambos menos las reducciones aplicables',
      'Las reducciones por aportaciones a planes de pensiones se restan aquí',
    ],
    dondeVer: 'En tu declaración de la renta del año anterior: casilla 480 (Renta-web).',
  },
  reducciones: {
    titulo: 'Reducciones de la base imponible',
    contenido: 'Son cantidades que se restan de la base imponible antes de calcular el impuesto. Incluyen aportaciones a planes de pensiones, seguros de dependencia, etc.',
    ejemplos: [
      'Aportación a plan de pensiones: hasta 1.500€/año',
      'Aportación a planes de pensiones de cónyuge: hasta 1.000€ adicionales',
      'Contribuciones a mutualidades de previsión social',
    ],
    dondeVer: 'Certificados de aportaciones de tu banco o plan de pensiones. Casilla 485 de la Renta-web.',
  },
  deducciones: {
    titulo: 'Deducciones sobre la cuota',
    contenido: 'Son cantidades que se restan directamente de la cuota líquida (el impuesto ya calculado). Incluyen deducciones autonómicas, por familia numerosa, por discapacidad, etc.',
    ejemplos: [
      'Deducción por familia numerosa: hasta 1.200€/año',
      'Deducción por hijos menores de 3 años: 250€/hijo/año',
      'Deducciones autonómicas varían según comunidad',
    ],
    dondeVer: 'En tu declaración anterior. Las deducciones autonómicas están en la web de tu comunidad autónoma.',
  },
  pagosACuenta: {
    titulo: 'Pagos a cuenta',
    contenido: 'Son las retenciones que te han practiced a lo largo del año (n nóminas, retenciones de alquileres, etc.) y los pagos fraccionados trimestrales si eres autónomo. Se restan de la cuota para saber si te devuelven o debes.',
    ejemplos: [
      'Retenciones de nómina: suma anual de retenciones IRPF',
      'Pagos fraccionados trimestrales (modelo 130/131) si eres autónomo',
      'Retenciones de alquileres cobrados',
    ],
    dondeVer: 'En tu nómina anual: "Total retenciones IRPF". En resúmenes de pagos trimestrales.',
  },
  resultado: {
    titulo: 'Resultado de la declaración',
    contenido: 'Es lo que te devuelven (negativo) o lo que debes pagar (positivo). Se calcula: cuota líquida – deducciones – pagos a cuenta.',
    ejemplos: [
      'Si el resultado es -500€, Hacienda te devuelve 500€',
      'Si el resultado es 1.200€, debes pagar 1.200€',
    ],
    dondeVer: 'Casilla 714 de la Renta-web (resultado a deducir) o casilla 716 (resultado a ingresar).',
  },
}

export const GUIA_MODELO_111: Record<string, GuiaCampo> = {
  baseRetencion: {
    titulo: 'Base de la retención',
    contenido: 'Es el importe bruto sobre el que se aplica la retención. Corresponde a los rendimientos íntegros del trabajo, actividades económicas o premios.',
    ejemplos: [
      'Si pagas 2.000€ a un trabajador, la base es 2.000€',
      'En una factura de un profesional: el importe bruto sin IVA',
    ],
    dondeVer: 'En la factura recibida del profesional o en la nómina del trabajador.',
  },
  tipoRetencion: {
    titulo: 'Tipo de retención',
    contenido: 'El porcentaje que debes retener sobre la base. Varía según el tipo de rendimiento y la situación del perceptor.',
    ejemplos: [
      'Trabajo general: 15% (24% los primeros 2 años como nuevo autónomo)',
      'Profesionales: 15% (24% los primeros 2 años)',
      'Arrendadores de inmuebles: 19% (si el arrendador es empresa, 24%)',
      'Premios de lotería: 20% (premios <40.000€)',
    ],
    dondeVer: 'Artículo 80 del Reglamento del IRPF. Tabla de tipos en la web de la AEAT.',
  },
  retencionPracticada: {
    titulo: 'Retención practicada',
    contenido: 'Es la cantidad que realmente has retenido sobre la base de retención. Se calcula: base × tipo / 100. Es el importe que ingresas trimestralmente en Hacienda.',
    ejemplos: [
      'Base 2.000€ × 15% = 300€ de retención',
      'Base 5.000€ × 15% = 750€ de retención',
    ],
    dondeVer: 'Calcula: base de retención × tipo de retención / 100.',
  },
}

export const GUIA_MODELO_131: Record<string, GuiaCampo> = {
  activosFijos: {
    titulo: 'Módulo por activos fijos',
    contenido: 'Es un valor fijo que se asigna por cada unidad de activo fijo (maquinaria, herramientas, vehículos) utilizados en la actividad. Se multiplica por el número de unidades.',
    ejemplos: [
      'Si tienes 2 furgonetas de reparto, el módulo se multiplica por 2',
      'Una máquina de CNC en un taller: se cuenta como 1 unidad',
    ],
    dondeVer: 'Tablas de módulos publicadas por la AEAT para cada epígrafe del IAE.',
  },
  metrosCuadrados: {
    titulo: 'Módulo por metros cuadrados',
    contenido: 'Es el módulo que se aplica por cada metro cuadrado del local donde ejerces la actividad. Es uno de los factores que más influye en el módulo anual.',
    ejemplos: [
      'Si tu local tiene 50m² y el módulo es 22,28€/m², el subtotal es 1.114€',
      'Un trastero de 15m² también se cuenta como espacio de actividad',
    ],
    dondeVer: 'Medida del local en tu contrato de alquiler o escritura. Tabla de módulos en la AEAT.',
  },
  personal: {
    titulo: 'Módulo por personal asalariado',
    contenido: 'Es el módulo que se asigna por cada empleado que tienes dado de alta. Incluye también a los socios que trabajan en la empresa.',
    ejemplos: [
      'Si tienes 1 empleado: el módulo se multiplica por 1',
      'Si eres socio y trabajas, cuentas también como 1 unidad',
    ],
    dondeVer: 'Altas en la Seguridad Social de tu empresa.',
  },
  kcalAnuales: {
    titulo: 'Kilovatios de potencia contratada',
    contenido: 'Es la potencia eléctrica contratada en el local de la actividad. Se usa en actividades como hostelería o industria donde el consumo eléctrico es significativo.',
    ejemplos: [
      'Si tienes 10 kW contratados y el módulo es 1,5€/kW, subtotal = 15€',
      'Un restaurante suele tener entre 15-30 kW',
    ],
    dondeVer: 'En tu factura de luz: "Potencia contratada" (kW). En lafactura.com o en tu distribuidora.',
  },
  moduloAnual: {
    titulo: 'Módulo anual resultante',
    contenido: 'Es el resultado de multiplicar todos los factores anteriores. Representa la cuota anual por módulos antes de aplicar reducciones o bonificaciones. Se paga trimestralmente (25% cada trimestre).',
    ejemplos: [
      'Si tu módulo anual es 12.000€, cada trimestre pagas 3.000€',
      'Puedes aplicar bonificaciones el primer año (95%) y segundo año (50%) si eres nuevo autónomo',
    ],
    dondeVer: 'Calcula: activos fijos + metros cuadrados + personal + kcal × tarifas del módulo.',
  },
}

export const GUIA_MODELO_309: Record<string, GuiaCampo> = {
  ingresos: {
    titulo: 'Ingresos por actividades',
    contenido: 'Son los ingresos totales que has obtenido en el trimestre por ventas de bienes o prestación de servicios gravados con IVA. Es la suma de todas tus facturas emitidas en el periodo.',
    ejemplos: [
      'Si emitiste 5 facturas de 1.000€ cada una, los ingresos son 5.000€',
      'Incluye tanto ventas como servicios prestados en el trimestre',
    ],
    dondeVer: 'En tus facturas emitidas durante el trimestre. Suma los importes base de todas las facturas.',
  },
  tipoIva: {
    titulo: 'Tipo de IVA aplicado',
    contenido: 'El porcentaje de IVA que has repercutido en tus facturas. Depende del tipo de bienes o servicios que vendas.',
    ejemplos: [
      '21% para la mayoría de servicios profesionales',
      '10% para restauración, hostelería y algunos bienes',
      '4% para libros y productos básicos',
    ],
    dondeVer: 'En tus facturas emitidas: la línea "% IVA".',
  },
  cuotaIva: {
    titulo: 'Cuota de IVA repercutida',
    contenido: 'Es la cantidad de IVA que has cobrado a tus clientes. Se calcula: base imponible × tipo de IVA / 100. Es el dinero que debes declarar y, en su caso, ingresar.',
    ejemplos: [
      'Base 5.000€ × 21% = 1.050€ de cuota IVA',
      'Base 2.000€ × 10% = 200€ de cuota IVA',
    ],
    dondeVer: 'Calcula: ingresos × tipo de IVA / 100.',
  },
}

export const GUIA_MODELO_347: Record<string, GuiaCampo> = {
  tercero: {
    titulo: 'Tercero o grupo de terceros',
    contenido: 'Es el NIF del cliente o proveedor con el que has realizado operaciones. El modelo 347 declara las operaciones con terceros que superen el umbral anual.',
    ejemplos: [
      'Si facturaste 35.000€ a una empresa, su NIF aparecerá como tercero',
      'Un autónomo que te factura 15.000€ anuales también es tercero',
    ],
    dondeVer: 'En las facturas emitidas y recibidas. Consulta tu contabilidad o facturación.',
  },
  importeTotal: {
    titulo: 'Importe total anual',
    contenido: 'Es el total de operaciones realizadas con un tercero durante el año. Incluye IVA. Solo se declara si supera el umbral (4.001€ para 2025).',
    ejemplos: [
      'Si facturaste 45.000€ a un cliente durante el año, ese es el importe total',
      'Incluye todas las facturas emitidas y recibidas con ese tercero',
    ],
    dondeVer: 'Suma de todas las facturas del año con ese tercero (emitidas + recibidas).',
  },
  umbral: {
    titulo: 'Umbral de declaración',
    contenido: 'El mínimo de operaciones con un tercero para que debas declararlo. Si el importe total es inferior al umbral, no tienes que incluirlo en el modelo 347.',
    ejemplos: [
      'Umbral general: 4.001€/año (importe total)',
      'Para seguros: 3.001€/año',
      'Para entidades públicas: 5.001€/año',
    ],
    dondeVer: 'Artículo 32.1.j del Reglamento del IVA. Web de la AEAT.',
  },
}

export const GUIA_MODELO_714: Record<string, GuiaCampo> = {
  patrimonioNeto: {
    titulo: 'Patrimonio neto del contribuyente',
    contenido: 'Es la suma de todos tus bienes y derechos MINUS tus deudas a 31 de diciembre del año fiscal. Incluye viviendas, cuentas, acciones, fondos, joyas, vehículos, etc.',
    ejemplos: [
      'Vivienda habitual: valor catastral o de compraventa (500.000€)',
      'Cuentas bancarias: saldo a 31/12 (80.000€)',
      'Acciones y fondos: valor a 31/12 (120.000€)',
      'RESTA: hipoteca pendiente (200.000€), préstamos (30.000€)',
    ],
    dondeVer: 'Valor catastral (IBI), saldo de cuentas a 31/12, valor de cartera de inversión, hipoteca pendiente.',
  },
  tipoMarginal: {
    titulo: 'Tipo marginal del impuesto',
    contenido: 'El porcentaje que se aplica a la parte del patrimonio que supera el mínimo exento. A mayor patrimonio, mayor tipo marginal. Se calcula según la escala del impuesto.',
    ejemplos: [
      'Patrimonio 700.001€ a 2.000.000€: tipo marginal del 0,2%',
      'Patrimonio 2.000.001€ a 3.000.000€: tipo marginal del 0,3%',
      'Patrimonio 3.000.001€ a 5.000.000€: tipo marginal del 0,5%',
      'Patrimonio >5.000.000€: tipo marginal del 1,0%',
    ],
    dondeVer: 'Artículo 31.2 de la Ley del Patrimonio. Tabla de tipos en la web de la AEAT.',
  },
}

export const GUIA_MODELO_369: Record<string, GuiaCampo> = {
  paisDestino: {
    titulo: 'País de destino',
    contenido: 'Es el país de la UE al que vendes bienes o prestas servicios electrónicos. El IVA se aplica según la legislación del país destino, no la española.',
    ejemplos: [
      'Si vendes a Alemania, el país destino es Alemania',
      'Si prestas servicios digitales a Francia, el país es Francia',
    ],
    dondeVer: 'En la dirección de facturación de tu cliente. El país del receptor determina la legislación aplicable.',
  },
  baseImponible: {
    titulo: 'Base imponible de las ventas',
    contenido: 'Es el importe total de las ventas realizadas a clientes en ese país de destino. Es la suma de las bases imponibles de todas las facturas emitidas.',
    ejemplos: [
      'Si facturaste 10.000€ a clientes de Alemania, esa es la base',
      'Incluye tanto bienes físicos como servicios electrónicos',
    ],
    dondeVer: 'Suma de las bases imponibles de todas las facturas del trimestre con clientes de ese país.',
  },
  tipoIvaPais: {
    titulo: 'Tipo de IVA del país destino',
    contenido: 'Es el porcentaje de IVA vigente en el país del cliente. Varía según el país y el tipo de producto o servicio. El OSS aplica el tipo local.',
    ejemplos: [
      'Alemania: 19% (general)',
      'Francia: 20% (general)',
      'Italia: 22% (general)',
      'Países Bajos: 21% (general)',
    ],
    dondeVer: 'Web de la Comisión Europea: "VAT rates in the EU". O busca "IVA [país]" en Google.',
  },
}

export const GUIA_MODELO_200: Record<string, GuiaCampo> = {
  tipoEntidad: {
    titulo: 'Tipo de entidad',
    contenido: 'El tipo de entidad determina el tipo impositivo del Impuesto sobre Sociedades. La mayoría de pymes aplican el tipo reducido del 25%.',
    ejemplos: [
      'General: 25% — tipo estándar para la mayoría de sociedades',
      'Pymes reducida: 23% — para empresas con cifra de negocios <1.000.000€',
      'Pyme nueva: 15% — primeros 2 años con actividad positiva',
      'Entidades de inversión colectiva: 1%',
    ],
    dondeVer: 'En tu escritura de constitución y en el modelo 200 del año anterior.',
  },
  ingresosExplotacion: {
    titulo: 'Ingresos de explotación',
    contenido: 'Son los ingresos habituales de la empresa por su actividad principal: ventas de bienes, prestación de servicios, etc. No incluye ingresos financieros ni extraordinarios.',
    ejemplos: [
      'Ventas de productos: 500.000€',
      'Ingresos por servicios prestados: 200.000€',
      'NO incluyas intereses bancarios ni subvenciones',
    ],
    dondeVer: 'En tu cuenta de resultados: cifra de negocios o ingresos de explotación.',
  },
  gastosExplotacion: {
    titulo: 'Gastos de explotación',
    contenido: 'Son los gastos necesarios para la actividad habitual de la empresa: compras, salarios, alquileres, suministros, seguros, amortizaciones, etc.',
    ejemplos: [
      'Compras de mercaderías: 150.000€',
      'Salarios y cuotas de seguridad social: 180.000€',
      'Alquiler de local: 24.000€',
      'Amortizaciones: 15.000€',
    ],
    dondeVer: 'En tu cuenta de resultados o en tu contabilidad: apuntes de gastos del ejercicio.',
  },
  gastosFinancieros: {
    titulo: 'Gastos financieros',
    contenido: 'Son los gastos derivados de operaciones de financiación: intereses de préstamos, descuentos comerciales, diferencias de cambio, etc.',
    ejemplos: [
      'Intereses de préstamo bancario: 5.000€',
      'Comisiones bancarias: 1.200€',
      'Descuentos por pronto pago concedidos: 800€',
    ],
    dondeVer: 'Extractos bancarios, contratos de préstamo. Casillas 011-016 del modelo 200.',
  },
  resultadoContable: {
    titulo: 'Resultado contable antes de impuestos',
    contenido: 'Es el beneficio o pérdida que aparece en tu cuenta de resultados antes de ajustes fiscales. Se calcula: ingresos – gastos.',
    ejemplos: [
      'Si tus ingresos son 700.000€ y tus gastos 620.000€, el resultado es 80.000€',
      'Si el resultado es negativo, es una pérdida contable',
    ],
    dondeVer: 'Cuenta de resultados del ejercicio. Casilla 001 del modelo 200 (resultado contable).',
  },
  ajustesFiscales: {
    titulo: 'Ajustes fiscales (positivos y negativos)',
    contenido: 'Son modificaciones al resultado contable para calcular la base imponible. Incluyen gastos no deducibles (multas, donaciones > límite), ingresos exentos, amortizaciones especiales, etc.',
    ejemplos: [
      'Multas y sanciones: NO son deducibles → ajuste positivo',
      'Ingresos por subvenciones de capital: exentos → ajuste negativo',
      'Diferencias temporarias: provisiones contables no deducibles',
    ],
    dondeVer: 'Hoja de cálculo de ajustes del modelo 200. Libro registro de ajustes fiscales.',
  },
  basesNegativas: {
    titulo: 'Bases imponibles negativas anteriores',
    contenido: 'Son pérdidas fiscales de ejercicios anteriores que se arrastran para compensar beneficios futuros. Se pueden compensar con un límite del 25% de la base imponible positiva del ejercicio (75% para entidades de gran tamaño).',
    ejemplos: [
      'Si en 2023 tuviste 50.000€ de base negativa, puedes compensar hasta 25% de tu base positiva de 2024',
      'El plazo máximo es 5 años (15 años para pérdidas anteriores a 2018)',
    ],
    dondeVer: 'Modelo 200 del año anterior. Hoja de cálculo de bases negativas (apartado 8 del modelo 200).',
  },
  deducciones: {
    titulo: 'Deducciones y bonificaciones',
    contenido: 'Son reducciones sobre la cuota íntegra del impuesto. Incluyen deducciones por I+D+i, reinversiones, incentivos regionales, etc.',
    ejemplos: [
      'Deducción por I+D+i: hasta 25% de gastos (42% superpoderes)',
      'Bonificación en cuota por creación de empleo: 500€ por nuevo empleado',
      'Deducción por inversiones en Canarias, Ceuta y Melilla',
    ],
    dondeVer: 'Modelo 200: apartado 7 (deducciones). Certificados de I+D de la AEAT.',
  },
  pagosFraccionados: {
    titulo: 'Pagos fraccionados efectuados',
    contenido: 'Son los anticipos trimestrales que la empresa ha pagado a Hacienda a cuenta del impuesto del año. Se restan de la cuota íntegra para obtener el resultado de la declaración.',
    ejemplos: [
      '4 pagos trimestrales de 5.000€ cada uno = 20.000€ totales',
      'Si la cuota íntegra es 50.000€, debes ingresar 30.000€ (50.000 – 20.000)',
    ],
    dondeVer: 'Modelos 202/222 trimestrales. Resumen de pagos en la declaración del año anterior.',
  },
  retenciones: {
    titulo: 'Retenciones y pagos a cuenta',
    contenido: 'Son las retenciones que la empresa ha practicado a proveedores y profesionales, y que ya ha ingresado a Hacienda. Se restan de la cuota pendiente.',
    ejemplos: [
      'Retenciones a profesionales (15%): 3.000€',
      'Retenciones por arrendamientos (19%): 2.400€',
      'Retenciones por dividendos pagados: 1.000€',
    ],
    dondeVer: 'Modelo 111 (trimestral) y 190 (anual). Registro de retenciones de tu contabilidad.',
  },
}

export const GUIA_MODELO_210: Record<string, GuiaCampo> = {
  tipoRenta: {
    titulo: 'Tipo de renta',
    contenido: 'La naturaleza de los rendimientos obtenidos por el contribuyente no residente. Cada tipo de renta tiene un tratamiento fiscal diferente.',
    ejemplos: [
      'Rendimientos inmobiliarios (alquileres): gravamen general del 19% (24% si no UE)',
      'Rendimientos de capitales mobiliarios (intereses, dividendos): 19%',
      'Ganancias patrimoniales: 19%',
      'Rendimientos de actividades económicas: 24%',
    ],
    dondeVer: 'En las facturas o contratos que generan la renta. Consulta el artículo 25 de la Ley del IRNR.',
  },
  residenteUE: {
    titulo: '¿Residente en la UE/EEE?',
    contenido: 'Determina si el no residente es ciudadano de la Unión Europea o del Espacio Económico Europeo. Los residentes UE tributan al tipo general del 19%, mientras que los no residentes fuera de la UE tributan al 24% (salvo excepciones).',
    ejemplos: [
      'Residente en Alemania → UE → 19%',
      'Residente en Marruecos → no UE → 24%',
      'Residente en Reino Unido → no UE (post-Brexit) → 24%',
    ],
    dondeVer: 'Pasaporte o certificado de residencia fiscal del contribuyente.',
  },
  baseImponible: {
    titulo: 'Base imponible',
    contenido: 'El importe bruto de la renta obtenida por el no residente en España. Para inmuebles, es el valor catastral o el desglose del contrato.',
    ejemplos: [
      'Alquiler de un piso: 800€/mes → base imponible 9.600€/año',
      'Dividendos de empresa española: importe íntegro cobrado',
    ],
    dondeVer: 'Contrato de arrendamiento, certificado de dividendos o intereses del banco.',
  },
  retencionPracticada: {
    titulo: 'Retención practicada',
    contenido: 'Es el importe que el pagador (empresa española o inquilino) ha retenido al no residente. Se ingresa trimestralmente en Hacienda con el modelo 216.',
    ejemplos: [
      'Alquiler 800€/mes × 19% retención = 152€/mes retenidos',
      'Si el inquilino es empresa, retiene el 19% y lo ingresa con el modelo 216',
    ],
    dondeVer: 'Certificado de retenciones emitido por el pagador. Modelo 216 trimestral.',
  },
  gastosDeducibles: {
    titulo: 'Gastos deducibles',
    contenido: 'Para rendimientos inmobiliarios, se puede deducir el 60% de los gastos (excepto para inmuebles arrendados a empresas). Para otras rentas, los gastos varían según el tipo.',
    ejemplos: [
      'Alquiler a persona física: base 9.600€ – 60% gastos = 3.840€ de base imponible reducida',
      'Alquiler a empresa: NO se admiten gastos deducibles',
      'Dividendos y intereses: NO se deducen gastos',
    ],
    dondeVer: 'Artículo 25 de la Ley del IRNR. Instrucciones del modelo 210.',
  },
}

export const GUIA_MODELO_220: Record<string, GuiaCampo> = {
  nombreEntidad: {
    titulo: 'Nombre de la entidad dominante',
    contenido: 'Es el nombre fiscal de la empresa que presenta la declaración consolidada (la que controla al grupo). Debe ser la entidad residente en España que ostente la mayoría del capital.',
    ejemplos: [
      'Si "Grupo Empresa S.L." controla a las filiales, esa es la entidad dominante',
      'La entidad dominante presenta el modelo 220 en nombre de todo el grupo',
    ],
    dondeVer: 'Escritura de constitución y estatutos de la entidad dominante. Registro Mercantil.',
  },
  nif: {
    titulo: 'NIF de la entidad dominante',
    contenido: 'El número de identificación fiscal de la empresa que presenta la declaración consolidada del grupo.',
    ejemplos: [
      'B12345678 (persona jurídica)',
      'Se repite en la cabecera del modelo 220 y en cada hoja de entidades',
    ],
    dondeVer: 'Tarjeta censal de la entidad dominante. Modelo 200 del año anterior.',
  },
  baseImponible: {
    titulo: 'Base imponible consolidada',
    contenido: 'Es la suma de las bases imponibles de todas las entidades del grupo, una vez eliminadas las operaciones internas entre ellas. Se suman beneficios y pérdidas de todas las filiales.',
    ejemplos: [
      'Entidad A: base 100.000€, Entidad B: base –30.000€ → base consolidada: 70.000€',
      'Se eliminan las facturas entre entidades del grupo (ventas internas)',
    ],
    dondeVer: 'Cuentas individuales de cada entidad del grupo. Casillas 001 de cada hoja individual del modelo 220.',
  },
  cuotaIntegra: {
    titulo: 'Cuota íntegra del grupo',
    contenido: 'Es el impuesto total que corresponde al grupo antes de aplicar deducciones. Se calcula aplicando el tipo impositivo a la base imponible consolidada.',
    ejemplos: [
      'Base consolidada 70.000€ × 25% = 17.500€ de cuota íntegra',
      'Si el tipo es el reducido (23%), la cuota sería 16.100€',
    ],
    dondeVer: 'Casilla 056 del modelo 220. Se calcula automáticamente al introducir la base imponible.',
  },
  pagosAnteriores: {
    titulo: 'Pagos fraccionados anteriores',
    contenido: 'Son los anticipos trimestrales que el grupo ha pagado a Hacienda a lo largo del año. Se restan de la cuota íntegra para calcular el resultado a ingresar.',
    ejemplos: [
      '4 pagos trimestrales de 4.500€ = 18.000€ totales pagados por anticipado',
      'Si la cuota íntegra es 17.500€ y pagaste 18.000€, te devuelven 500€',
    ],
    dondeVer: 'Modelos 202/222 trimestrales del grupo. Resumen de pagos del ejercicio anterior.',
  },
}

export const GUIA_MODELO_232: Record<string, GuiaCampo> = {
  tipoOperacion: {
    titulo: 'Tipo de operación vinculada',
    contenido: 'La naturaleza de la operación realizada con la entidad vinculada. Existen diferentes categorías según la normativa fiscal.',
    ejemplos: [
      'Transmisión de inmuebles',
      'Transmisión de valores o participaciones',
      'Prestación de servicios (consultoría, gestión, etc.)',
      'Préstamos y operaciones financieras',
    ],
    dondeVer: 'Artículo 18.2 de la Ley del Impuesto sobre Sociedades. Instrucciones del modelo 232.',
  },
  contraparte: {
    titulo: 'Contraparte',
    contenido: 'La persona o entidad con la que se realiza la operación vinculada. Debe ser una entidad que, directa o indirectamente, participe en la gestión, control o capital de la empresa.',
    ejemplos: [
      'Una sociedad cuyo administrador es también administrador de tu empresa',
      'Una empresa del mismo grupo que controla tu empresa',
      'Un familiar en línea directa con participación significativa',
    ],
    dondeVer: 'Artículo 18 de la Ley del IS. Consulta el organigrama societario y los registros de vinculación.',
  },
  nif: {
    titulo: 'NIF de la contraparte',
    contenido: 'El número de identificación fiscal de la entidad o persona con la que se realiza la operación vinculada.',
    ejemplos: [
      'B87654321 (empresa vinculada)',
      '12345678Z (persona física vinculada)',
    ],
    dondeVer: 'Facturas o contratos con la contraparte. Registro mercantil.',
  },
  importe: {
    titulo: 'Importe de la operación',
    contenido: 'El valor total de la operación realizada con la contraparte vinculada. Se expresa en euros y debe coincidir con el importe declarado en el impuesto sobre sociedades.',
    ejemplos: [
      'Una consultoría de 50.000€ entre empresas vinculadas',
      'Una transmisión de inmuebles por 300.000€',
    ],
    dondeVer: 'Facturas emitidas o recibidas de la operación vinculada. Contabilidad de la empresa.',
  },
  metodoValoracion: {
    titulo: 'Método de valoración',
    contenido: 'El método utilizado para demostrar que la operación se ha realizado a valor de mercado. La AEAT acepta varios métodos equivalentes a los de la OCDE.',
    ejemplos: [
      'Método del precio libre comparable: comparar con operaciones similares',
      'Método del coste加成: coste + margen habitual del sector',
      'Método de la transacción下限: precio que habría pactado partes independientes',
    ],
    dondeVer: 'Artículo 18.4 de la Ley del IS. Manual de precios de transferencia de la AEAT.',
  },
}

export const GUIA_MODELO_296: Record<string, GuiaCampo> = {
  nif: {
    titulo: 'NIF del perceptor',
    contenido: 'El número de identificación fiscal de la persona o entidad no residente a la que se le han practicado retenciones a lo largo del año.',
    ejemplos: [
      'B12345678 (empresa no residente)',
      'GB123456789 (NIF de Reino Unido)',
      'X12345678 (representación permanente)',
    ],
    dondeVer: 'Contratos y facturas con la entidad no residente. Alta censal del no residente.',
  },
  nombre: {
    titulo: 'Nombre o razón social',
    contenido: 'El nombre completo de la persona o entidad no residente a la que se practicaron las retenciones. Debe coincidir con los datos del registro.',
    ejemplos: [
      'Acme GmbH (empresa alemana)',
      'John Smith (persona física británica)',
    ],
    dondeVer: 'Contratos, facturas o escrituras con la contraparte.',
  },
  baseImponible: {
    titulo: 'Base imponible total anual',
    contenido: 'La suma de todas las bases imponibles de las retenciones practicadas a lo largo del año a ese no residente.',
    ejemplos: [
      'Si mensualmente retuviste 1.000€ de base × 12 meses = 12.000€ de base total anual',
      'Incluye todas las rentas del mismo tipo satisfechas al mismo perceptor',
    ],
    dondeVer: 'Suma de las bases de los modelos 216 trimestrales de ese perceptor.',
  },
  retencion: {
    titulo: 'Retención total practicada',
    contenido: 'La suma de todas las retenciones practicadas a lo largo del año a ese no residente. Es el importe total que se ha ingresado a Hacienda con los modelos 216.',
    ejemplos: [
      'Si retuviste 190€/mes × 12 meses = 2.280€ de retención total',
      'Si el tipo es 24% (no UE), la retención será mayor',
    ],
    dondeVer: 'Suma de las retenciones de los modelos 216 trimestrales de ese perceptor.',
  },
  tipoRenta: {
    titulo: 'Tipo de renta satisfecha',
    contenido: 'La naturaleza de la renta pagada al no residente: inmobiliaria, mobiliaria, ganancias patrimoniales, etc. Determina el tipo de retención aplicable.',
    ejemplos: [
      'Arrendamiento de inmuebles: renta inmobiliaria (19% UE, 24% no UE)',
      'Dividendos: renta mobiliaria (19%)',
      'Intereses: renta mobiliaria (19%)',
    ],
    dondeVer: 'Artículo 25 de la Ley del IRNR. Modelo 200 del perceptor no residente.',
  },
}

export const GUIA_MODELO_720: Record<string, GuiaCampo> = {
  tipoBien: {
    titulo: 'Tipo de bien o derecho en el extranjero',
    contenido: 'La naturaleza del activo o derecho que posees fuera de España. Cada tipo tiene umbrales específicos para la obligación de declarar.',
    ejemplos: [
      'Cuentas bancarias (incluyendo depósitos, libretas)',
      'Valores, participaciones en fondos, acciones',
      'Inmuebles (pisos, terrenos, locales)',
      'Seguros de vida o rentas vitalicias',
    ],
    dondeVer: 'Extractos bancarios, escrituras de propiedad o contratos en el extranjero.',
  },
  pais: {
    titulo: 'País del bien',
    contenido: 'El país donde se encuentra el bien o derecho. Debe indicarse el código ISO del país.',
    ejemplos: [
      'Alemania: DE',
      'Estados Unidos: US',
      'Reino Unido: GB',
      'Suiza: CH',
    ],
    dondeVer: 'En tu extracto bancario o escritura del inmueble. Consulta la dirección o jurisdicción.',
  },
  descripcion: {
    titulo: 'Descripción del bien',
    contenido: 'Una descripción detallada del bien o derecho que posees en el extranjero. Incluye el nombre de la entidad financiera, dirección del inmueble, etc.',
    ejemplos: [
      'Cuenta bancaria en Deutsche Bank, Frankfurt',
      'Piso en Londres, 15 Downing Street',
      'Participaciones en fondo Vanguard Total Stock Market',
    ],
    dondeVer: 'Extractos, contratos o escrituras. Datos de la entidad financiera o del inmueble.',
  },
  valor: {
    titulo: 'Valor a 31 de diciembre',
    contenido: 'El valor o saldo del bien o derecho a 31 de diciembre del año fiscal. Para cuentas bancarias es el saldo medio del último trimestre o el saldo a 31/12 si es mayor.',
    ejemplos: [
      'Cuenta bancaria: saldo a 31/12 o saldo medio del último trimestre',
      'Inmueble: valor de adquisición o valor catastral',
      'Acciones: cotización a 31/12 × número de participaciones',
    ],
    dondeVer: 'Extracto bancario a 31/12. Certificado de valores. Escritura de compraventa.',
  },
}

export const GUIA_MODELO_721: Record<string, GuiaCampo> = {
  nombreExchange: {
    titulo: 'Nombre del exchange o plataforma',
    contenido: 'El nombre de la plataforma de criptomonedas donde custodias tus activos digitales. Puede ser un exchange centralizado (Binance, Coinbase) o un protocolo descentralizado.',
    ejemplos: [
      'Binance',
      'Coinbase',
      'Kraken',
      'Bitstamp',
      'Plataforma descentralizada (Uniswap, etc.)',
    ],
    dondeVer: 'En tu cuenta del exchange. Panel principal o configuración de la plataforma.',
  },
  paisExchange: {
    titulo: 'País del exchange',
    contenido: 'El país donde está domiciliada la plataforma de criptomonedas. Es obligatorio indicarlo aunque no exista un umbral mínimo por valor.',
    ejemplos: [
      'Binance: Islas Caimán (pero operan globalmente)',
      'Coinbase: Estados Unidos (US)',
      'Kraken: Estados Unidos (US)',
    ],
    dondeVer: 'En los términos y condiciones del exchange. Sección "About" o "Legal".',
  },
  tipoMoneda: {
    titulo: 'Tipo de moneda virtual',
    contenido: 'La criptomoneda que posees en esa plataforma. Debe indicarse el nombre y ticker de cada moneda.',
    ejemplos: [
      'Bitcoin (BTC)',
      'Ethereum (ETH)',
      'Solana (SOL)',
      'USDT (Tether)',
    ],
    dondeVer: 'En tu cartera del exchange. Lista de activos poseídos.',
  },
  saldoFinAno: {
    titulo: 'Saldo a final de año',
    contenido: 'El número de unidades de cada moneda virtual que posees a 31 de diciembre del año fiscal.',
    ejemplos: [
      '0,5 BTC a 31/12/2025',
      '10 ETH a 31/12/2025',
      '500 USDT a 31/12/2025',
    ],
    dondeVer: 'Extracto o historial de la plataforma a 31 de diciembre.',
  },
  valorMercado: {
    titulo: 'Valor de mercado a 31 de diciembre',
    contenido: 'El valor en euros de tus criptomonedas a 31 de diciembre del año fiscal. Se usa el precio de cierre del día en la plataforma principal de cotización.',
    ejemplos: [
      '0,5 BTC × 42.000€ = 21.000€',
      '10 ETH × 2.500€ = 25.000€',
    ],
    dondeVer: 'Precio de cierre a 31/12 en CoinMarketCap, CoinGecko o tu exchange.',
  },
  numOperaciones: {
    titulo: 'Número de operaciones realizadas',
    contenido: 'El número total de operaciones de compraventa, canje o transferencia que has realizado con criptomonedas durante el año.',
    ejemplos: [
      '25 compraventas en el año',
      '10 canjes entre monedas',
      '5 transferencias a otros wallets',
    ],
    dondeVer: 'Historial de transacciones en tu exchange. Exportar en CSV o PDF.',
  },
}

export const GUIA_MODELO_184: Record<string, GuiaCampo> = {
  tipoEntidad: {
    titulo: 'Tipo de entidad',
    contenido: 'La naturaleza jurídica de la entidad en atribución de rentas. Determina las reglas específicas de declaración.',
    ejemplos: [
      'Sociedad civil o comunidad de bienes',
      'Herencia yacente',
      'Sociedades civiles mercantiles o agrarias',
      'Comunidades de propietarios',
    ],
    dondeVer: 'Escritura de constitución de la entidad. Contrato de sociedad.',
  },
  numSocios: {
    titulo: 'Número de socios o comuneros',
    contenido: 'El total de personas que participan en la entidad (socios, comuneros, herederos). Se usa para la información censal.',
    ejemplos: [
      'Sociedad civil con 3 socios → 3',
      'Herencia yacente con 4 herederos → 4',
      'Comunidad de propietarios con 20 comuneros → 20',
    ],
    dondeVer: 'Escritura de constitución o acta de la entidad. Registro de socios.',
  },
  rentasInmobiliarias: {
    titulo: 'Rentas inmobiliarias',
    contenido: 'Las rentas obtenidas por la entidad procedentes de bienes inmuebles: alquileres, arrendamientos, cesiones de uso, etc.',
    ejemplos: [
      'Alquiler de un local: 24.000€/año',
      'Alquiler de viviendas: 12.000€/año',
      'Cesión de uso de naves industriales: 36.000€/año',
    ],
    dondeVer: 'Contratos de arrendamiento. Facturas de alquiler cobradas.',
  },
  rentasMobiliarias: {
    titulo: 'Rentas mobiliarias',
    contenido: 'Las rentas obtenidas por la entidad procedentes de capitales mobiliarios: dividendos, intereses, cuotas de participaciones, etc.',
    ejemplos: [
      'Dividendos de acciones: 5.000€',
      'Intereses de cuentas o depósitos: 1.200€',
      'Participaciones en fondos de inversión: 3.000€',
    ],
    dondeVer: 'Certificados de retenciones del banco. Extractos de cuentas de inversión.',
  },
  rentasActividades: {
    titulo: 'Rentas de actividades económicas',
    contenido: 'Las rentas obtenidas por la entidad por actividades empresariales o profesionales. Incluye ventas de bienes y prestación de servicios.',
    ejemplos: [
      'Facturación de servicios profesionales: 150.000€',
      'Ventas de productos: 80.000€',
      'Actividad agraria: 40.000€',
    ],
    dondeVer: 'Libros de facturas emitidas y recibidas. Contabilidad de la entidad.',
  },
  gananciasPatrimoniales: {
    titulo: 'Ganancias y pérdidas patrimoniales',
    contenido: 'Las ganancias o pérdidas obtenidas por la entidad por la diferencia entre el valor de transmisión y el valor de adquisición de bienes y derechos.',
    ejemplos: [
      'Venta de un inmueble: valor de venta – valor de compra',
      'Venta de acciones: cotización de venta – cotización de compra',
      'Pérdida por deterioro de un préstamo: valor contable – valor recuperable',
    ],
    dondeVer: 'Escrituras de compraventa. Notas de brokers. Contratos de transmisión.',
  },
}

export const GUIA_MODELO_151: Record<string, GuiaCampo> = {
  tipoComunicacion: {
    titulo: 'Tipo de comunicación',
    contenido: 'La naturaleza de la solicitud que presentas ante Hacienda. Puede ser alta, renuncia o modificación de la estimación objetiva (módulos).',
    ejemplos: [
      'Alta: cuando empiezas una actividad y eliges módulos como método de tributación',
      'Renuncia: cuando dejas de tributar por módulos y pasas a estimación directa',
      'Modificación: cambio de módulos o información censal relacionada',
    ],
    dondeVer: 'Artículo 33.1 del Reglamento del IRPF. Modelo 151 en la sede electrónica de la AEAT.',
  },
  nif: {
    titulo: 'NIF del titular',
    contenido: 'El número de identificación fiscal del autónomo o empresa que solicita el alta o renuncia de módulos.',
    ejemplos: [
      '12345678Z (autónomo)',
      'B12345678 (empresa)',
    ],
    dondeVer: 'Tarjeta de identificación fiscal del titular. Alta en el censo de empresarios.',
  },
  nombre: {
    titulo: 'Nombre y apellidos o razón social',
    contenido: 'El nombre completo del autónomo o la denominación social de la empresa que presenta la comunicación.',
    ejemplos: [
      'María García López (autónomo)',
      'Tecnología y Servicios S.L. (sociedad)',
    ],
    dondeVer: 'Escritura de constitución o alta censal.',
  },
  actividadEconomica: {
    titulo: 'Actividad económica',
    contenido: 'La descripción de la actividad que desarrollas. Debe coincidir con el epígrafe del IAE (Impuesto sobre Actividades Económicas) que tengas dado de alta.',
    ejemplos: [
      'Restaurante: epígrafe 561',
      'Tienda de ropa: epígrafe 643',
      'Consultoría informática: epígrafe 765',
    ],
    dondeVer: 'Alta en el IAE (modelo 840). Certificado censal de la AEAT.',
  },
  codigoIAE: {
    titulo: 'Código del IAE',
    contenido: 'El código numérico de la actividad económica según el Impuesto sobre Actividades Económicas. Es el epígrafe que identifica tu actividad.',
    ejemplos: [
      '561: Restaurantes y otros establecimientos de comida',
      '643: Comercio al por menor de ropa',
      '765: Ingeniería y arquitectura',
      '861: Asistencia sanitaria',
    ],
    dondeVer: 'Tarjeta censal de la AEAT. Alta en el IAE (modelo 840). Consulta en la web de la AEAT.',
  },
}

export const GUIA_MODELO_349: Record<string, GuiaCampo> = {
  tercero: {
    titulo: 'Tercero intracomunitario',
    contenido: 'Es el NIF y denominación del empresario o profesional con el que realizas operaciones intracomunitarias. Debe estar dado de alta en el Registro de Operadores Intracomunitarios (ROI).',
    ejemplos: [
      'Una empresa alemana con la que facturas 50.000€',
      'Un profesional francés que te presta servicios',
    ],
    dondeVer: 'En tus facturas intracomunitarias. Verifica su NIF en el VIES (Sistema VIES de la UE).',
  },
  pais: {
    titulo: 'País del tercero',
    contenido: 'Es el estado miembro de la UE donde está establecido el tercero con el que realizas la operación.',
    ejemplos: [
      'Alemania, Francia, Italia, Portugal...',
      'Si el tercero está en España, no es operación intracomunitaria',
    ],
    dondeVer: 'En la dirección del tercero en la factura.',
  },
  baseImponible: {
    titulo: 'Base imponible de la operación',
    contenido: 'Es el importe total de la operación intracomunitaria sin IVA. Para entregas de bienes es el precio de venta. Para servicios es el importe facturado.',
    ejemplos: [
      'Venta de mercancía a empresa alemana: precio de venta sin IVA',
      'Servicio prestado a cliente francés: importe del servicio',
    ],
    dondeVer: 'En la factura emitida al tercero intracomunitario.',
  },
}

export const GUIA_MODELO_130: Record<string, GuiaCampo> = {
  ingresos: {
    titulo: 'Ingresos acumulados del año',
    contenido: 'Son los ingresos íntegros de tu actividad desde el 1 de enero hasta el cierre del trimestre. Incluye todas tus facturas emitidas y cobradas, tanto con IVA como sin él.',
    ejemplos: [
      'Si en enero-marzo facturaste 12.000€, ese es tu ingreso acumulado del 1T',
      'Se acumulan: el 2T incluye lo de enero a junio',
      'NO descuentes aquí los gastos: eso va en el campo siguiente',
    ],
    dondeVer: 'En tus facturas emitidas del año. Súmalas sin IVA (base imponible).',
  },
  gastos: {
    titulo: 'Gastos deducibles acumulados',
    contenido: 'Son los gastos necesarios para tu actividad desde el 1 de enero: compras, alquiler del local, suministros, material, seguros. NO incluyen el IVA ni las cuotas de autónomo.',
    ejemplos: [
      'Alquiler local, luz, internet, material de oficina',
      'Compras de mercaderías, herramientas, software',
      'NO incluyas las cuotas de Seguridad Social ni el IVA',
    ],
    dondeVer: 'En tus facturas de gasto anuales (sin IVA y sin cuotas de autónomo).',
  },
  pagosAnteriores: {
    titulo: 'Pagos fraccionados anteriores',
    contenido: 'Es la suma de los pagos fraccionados trimestrales que ya has ingresado a Hacienda en trimestres anteriores del mismo año. Se restan de la cuota acumulada.',
    ejemplos: [
      'Si en el 1T ingresaste 400€, en el 2T pones 400€',
      'Si es el 1T, deja este campo en 0',
    ],
    dondeVer: 'En los modelos 130 de trimestres anteriores o el resumen de tu gestoría.',
  },
}

export const GUIA_MODELO_303: Record<string, GuiaCampo> = {
  trimestre: {
    titulo: 'Trimestre de la autoliquidación',
    contenido: 'El periodo al que corresponde la liquidación del IVA. Determina cómo se tratan los saldos negativos (en los tres primeros trimestres se compensan; en el 4T se puede solicitar devolución).',
    ejemplos: [
      '1T: enero-marzo (se presenta en abril)',
      '2T: abril-junio (presentación en julio)',
      '4T: octubre-diciembre (presentación en enero)',
    ],
    dondeVer: 'Calendario fiscal. Modelo 303 en la sede de la AEAT.',
  },
  baseRepercutida: {
    titulo: 'Base imponible repercutida',
    contenido: 'Es la base imponible (sin IVA) de tus ventas y servicios gravados con IVA. Se desglosa por tipo de IVA (21%, 10%, 4%). Es el IVA que has cobrado a tus clientes.',
    ejemplos: [
      'Facturaste 5.000€ + 21% IVA → base repercutida 21% = 5.000€',
      'Restaurante: base al 10% para comida',
    ],
    dondeVer: 'En tus facturas emitidas: la base imponible sin IVA.',
  },
  baseSoportada: {
    titulo: 'Base imponible soportada deducible',
    contenido: 'Es la base imponible (sin IVA) de tus gastos y compras deducibles. El IVA pagado en esos gastos es el que te puedes restar (cuota soportada deducible).',
    ejemplos: [
      'Compraste material por 1.000€ + 21% IVA → base soportada 21% = 1.000€',
      'Solo cuentan los gastos que son deducibles para la actividad',
    ],
    dondeVer: 'En tus facturas de gasto recibidas: la base imponible sin IVA.',
  },
  compensacion: {
    titulo: 'Compensación de saldo negativo',
    contenido: 'Si en trimestres anteriores tuviste más IVA soportado que repercutido (saldo a compensar), puedes restarlo ahora del resultado positivo de este trimestre.',
    ejemplos: [
      'En el 1T tuviste 300€ a compensar: los pones aquí y se restan del 2T',
      'Solo compensa saldos negativos del mismo año natural',
    ],
    dondeVer: 'En el resultado a compensar (casilla 54) de trimestres anteriores.',
  },
}

export const GUIA_MODELO_170: Record<string, GuiaCampo> = {
  baseImponible: {
    titulo: 'Base imponible',
    contenido: 'Es el importe bruto del arrendamiento de inmuebles urbanos sobre el que se aplica la retención. Se corresponde con el rendimiento satisfecho al arrendador antes de cualquier gasto.',
    ejemplos: [
      'Si pagas 900€/mes de alquiler de local, la base trimestral es 2.700€',
      'Incluye la renta pactada sin IVA (los arrendamientos de vivienda están exentos de IVA)',
    ],
    dondeVer: 'En el contrato de arrendamiento o en las facturas/recibos del arrendador.',
  },
  tipoRetencion: {
    titulo: 'Tipo de retención',
    contenido: 'El porcentaje que se retiene sobre la base imponible y se ingresa en Hacienda. El 19% aplica cuando el arrendador es persona física; el 24% cuando el arrendatario actúa como empresario o profesional en el ejercicio de su actividad (regla general desde 2015).',
    ejemplos: [
      'La empresa arrenda un local a un particular: retiene el 19%',
      'Una empresa alquila un local a otra empresa: retiene el 24%',
      'Un autónomo alquila un piso a un particular para uso personal: retiene el 19%',
    ],
    dondeVer: 'Art. 75.1.1º y Disposición Transitoria 31ª de la Ley del IRPF. Tipos publicados por la AEAT.',
  },
  cuotaRetenida: {
    titulo: 'Cuota retenida',
    contenido: 'Es el importe que se retiene y se ingresa trimestralmente en Hacienda. Se calcula: base imponible × tipo de retención / 100. Se declara en el modelo 170 y también se informa con el modelo 115 si eres el arrendatario.',
    ejemplos: [
      'Base 2.700€ × 19% = 513€ de cuota retenida',
      'Base 5.000€ × 24% = 1.200€ de cuota retenida',
    ],
    dondeVer: 'Calcula: base imponible × tipo de retención / 100. Modelos 170 y 115.',
  },
}

export const GUIA_MODELO_179: Record<string, GuiaCampo> = {
  viviendas: {
    titulo: 'Número de viviendas',
    contenido: 'El total de viviendas de uso turístico o arrendamientos de corta duración que cedes. Cada vivienda cuyo alquiler u otra forma de cesión de uso se comercialice por cualquier canal (plataformas, agencias, anuncios) debe declararse.',
    ejemplos: [
      '2 pisos en alquiler turístico → 2 viviendas',
      'Un piso y una cabaña en plataformas → 2 viviendas',
    ],
    dondeVer: 'Listado de tus viviendas o de los anuncios/plataformas donde las comercializas.',
  },
  diasAlquiler: {
    titulo: 'Días de alquiler',
    contenido: 'Los días que cada vivienda ha estado ocupada o cedida en el periodo. Si varias viviendas se alquilan días distintos, se usa la suma de días por vivienda.',
    ejemplos: [
      '120 días alquilada en el trimestre',
      'Si tienes 2 viviendas a 60 días cada una, el total son 120 días',
    ],
    dondeVer: 'Cuaderno de reservas o informes de actividad de las plataformas de alquiler.',
  },
  rendimiento: {
    titulo: 'Rendimiento del periodo',
    contenido: 'El importe total obtenido por los arrendamientos o cesiones de uso en el periodo informado. El modelo 179 es informativo: este importe no genera cuota, pero la AEAT lo cruza con la declaración de la renta.',
    ejemplos: [
      'Importe total cobrado por las reservas del trimestre',
      'Incluye el rendimiento de todas las viviendas declaradas',
    ],
    dondeVer: 'Cuaderno de reservas, extractos de las plataformas o CBD (cuaderno de bienes de inversión).',
  },
  promedioDias: {
    titulo: 'Promedio de días por vivienda',
    contenido: 'El resultado de dividir los días totales de alquiler entre el número de viviendas. Ayuda a ver el nivel medio de ocupación por inmueble.',
    ejemplos: [
      '120 días totales entre 2 viviendas → 60 días de media',
      '1.095 días totales entre 3 viviendas → 365 días de media (ocupación completa)',
    ],
    dondeVer: 'Calcula: días totales alquilados ÷ número de viviendas.',
  },
}

export const GUIA_MODELO_600: Record<string, GuiaCampo> = {
  valorBien: {
    titulo: 'Valor del bien',
    contenido: 'El valor real del bien transmitido o del acto que se documenta: viviendas, locales, vehículos usados, mobiliario, arrendamientos judiciales o documentos notariales sujetos a AJD.',
    ejemplos: [
      'Compra de una vivienda usada por 200.000€ → valor 200.000€',
      'Adquisición de un vehículo de segunda mano por 15.000€',
    ],
    dondeVer: 'Escritura de compraventa, contrato privado, factura o tasación del bien.',
  },
  baseLiquidable: {
    titulo: 'Base liquidable',
    contenido: 'Es la base sobre la que se aplica el tipo de gravamen. Normalmente coincide con el valor del bien, pero puede reducirse si la normativa autonómica establece reducciones o bases específicas para determinados actos.',
    ejemplos: [
      'En general coincide con el valor del bien transmitido',
      'Algunas CCAA aplican reducciones a viviendas habituales o menores de edad',
    ],
    dondeVer: 'Normativa de la comunidad autónoma donde se liquida. Instrucciones del modelo 600.',
  },
  tipoGravamen: {
    titulo: 'Tipo de gravamen',
    contenido: 'El porcentaje que se aplica sobre la base liquidable. El 6% es el tipo general orientativo para vivienda usada, pero cada comunidad autónoma fija sus propios tipos y existen tipos especiales según el acto (por ejemplo, adquisición de vivienda habitual, transmisión de automóviles, AJD).',
    ejemplos: [
      '6% orientativo para vivienda usada (varía por CCAA)',
      '4-5% en transmisión de vehículos en varias comunidades',
      'Hasta 10% en algunos actos patrimoniales',
    ],
    dondeVer: 'Normativa autonómica del impuesto. Web de la AEAT o del organismo tributario de tu CCAA.',
  },
  cuota: {
    titulo: 'Cuota',
    contenido: 'El importe a pagar. Se calcula: base liquidable × tipo de gravamen / 100. Se liquida con el modelo 600 y luego el notario, registrador o la propia transmisión queda documentada.',
    ejemplos: [
      'Base 200.000€ × 6% = 12.000€',
      'Base 180.000€ × 8% = 14.400€',
    ],
    dondeVer: 'Calcular: base liquidable × tipo de gravamen / 100. Modelo 600 y normativa autonómica.',
  },
}

export const GUIA_MODELO_233: Record<string, GuiaCampo> = {
  nifContraparte: {
    titulo: 'NIF de la contraparte',
    contenido: 'El número de identificación fiscal de la persona o entidad con la que se realiza la operación vinculada. La vinculación puede venir por socios, administradores, familiares en línea directa o entidades del mismo grupo.',
    ejemplos: [
      'B12345678 (entidad vinculada)',
      '12345678Z (persona física vinculada, por ejemplo un socio)',
    ],
    dondeVer: 'Facturas o contratos de la operación. Registro Mercantil o censo de la AEAT.',
  },
  importe: {
    titulo: 'Importe de la operación',
    contenido: 'El valor de la operación realizada con la contraparte vinculada en el ejercicio. Se suma por contraparte para comprobar si se supera el umbral de 250.000€.',
    ejemplos: [
      'Compraventa de mercancías entre sociedades del mismo grupo',
      'Préstamo entre socios y la entidad',
      'Prestación de servicios del administrador a la sociedad',
    ],
    dondeVer: 'Facturas emitidas y recibidas. Contabilidad de la entidad.',
  },
  umbral: {
    titulo: 'Umbral de declaración',
    contenido: 'El importe a partir del cual se declaran las operaciones vinculadas. Si el conjunto de operaciones realizadas con una misma contraparte supera los 250.000€ en el ejercicio, la entidad debe presentar el modelo 233.',
    ejemplos: [
      'Total 300.000€ con una contraparte → obligatorio',
      'Total 200.000€ con una contraparte → no obligatorio por importe',
    ],
    dondeVer: 'Art. 18.13 de la Ley del Impuesto sobre Sociedades. Instrucciones del modelo 233.',
  },
  superaUmbral: {
    titulo: 'Estado de declaración',
    contenido: 'Indica si el total de operaciones vinculadas supera el umbral de 250.000€. Si lo supera, la declaración es obligatoria; en caso contrario no será necesario presentar el modelo.',
    ejemplos: [
      'Total 250.000€ exactos → no supera el umbral',
      'Total 251.000€ → supera el umbral, declaración obligatoria',
    ],
    dondeVer: 'Art. 18.13 de la Ley del Impuesto sobre Sociedades. Modelo 233 en la sede electrónica de la AEAT.',
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
    modelo100: GUIA_MODELO_100,
    modelo111: GUIA_MODELO_111,
    modelo130: GUIA_MODELO_130,
    modelo131: GUIA_MODELO_131,
    modelo151: GUIA_MODELO_151,
    modelo303: GUIA_MODELO_303,
    modelo309: GUIA_MODELO_309,
    modelo347: GUIA_MODELO_347,
    modelo349: GUIA_MODELO_349,
    modelo369: GUIA_MODELO_369,
    modelo714: GUIA_MODELO_714,
    modelo200: GUIA_MODELO_200,
    modelo210: GUIA_MODELO_210,
    modelo220: GUIA_MODELO_220,
    modelo232: GUIA_MODELO_232,
    modelo296: GUIA_MODELO_296,
    modelo720: GUIA_MODELO_720,
    modelo721: GUIA_MODELO_721,
    modelo184: GUIA_MODELO_184,
    modelo170: GUIA_MODELO_170,
    modelo179: GUIA_MODELO_179,
    modelo600: GUIA_MODELO_600,
    modelo233: GUIA_MODELO_233,
  }
  return guias[seccion]?.[campo] ?? null
}
