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
      'Trabajo (nóminas): del 15% al 45% según la tabla de retenciones de la AEAT',
      'Profesionales: 15%, o 7% si inician actividad (año de inicio y los 2 siguientes)',
      'Arrendamientos: 19%',
      'Premios, concursos y ganancias patrimoniales: 19%',
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
  motivo: {
    titulo: 'Motivo de la declaración-liquidación no periódica',
    contenido:
      'El modelo 309 no es el régimen simplificado: se usa para liquidar operaciones que no procede incluir en un 303/322 periódico y, sobre todo, para rectificar autoliquidaciones del 303 o del 322 ya presentadas (indicando ejercicio y periodo de la autoliquidación original).',
    dondeVer: 'Ayuda técnica de la AEAT para los modelos 303 y 309; art. 38 del Reglamento del IVA.',
  },
  periodoOriginal: {
    titulo: 'Ejercicio y periodo rectificados',
    contenido:
      'En las rectificativas debe indicarse el ejercicio y el periodo (T1-T4 o M01-M12) de la autoliquidación que se sustituye, junto con el resultado originalmente liquidado: la diferencia es el importe a ingresar o a devolver.',
    dondeVer: 'Casillas de identificación del modelo 309.',
  },
  plazo: {
    titulo: 'Plazo',
    contenido:
      'El mismo que el del periodo del modelo 303/322 a que se refiera (p. ej. el del cuarto trimestre finaliza el 30 de enero del año siguiente).',
    dondeVer: 'Calendario del contribuyente de la AEAT.',
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
    contenido: 'Es el total de operaciones realizadas con un tercero durante el año. Incluye IVA. Solo se declara si supera el umbral (3.005,06 € para 2025).',
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
      'Umbral general: 3.005,06 €/año con cada tercero (IVA incluido)',
      'Cobro por cuenta de terceros de honorarios o propiedad intelectual/industrial: 300,51 €/año',
      'No se declaran operaciones ya informadas en otros modelos (180, 190, 193, 349...)',
    ],
    dondeVer: 'Artículo 32 del RD 1065/2007. Instrucciones del modelo 347 en la AEAT.',
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
  rendimientos: {
    titulo: 'Rendimientos del régimen (art. 93 LIRPF)',
    contenido:
      'Rendimientos de trabajo, actividades profesionales y alquileres de FUENTE ESPAÑOLA percibidos por el contribuyente acogido al régimen especial de trabajadores desplazados («Ley Beckham»). Las rentas de fuente extranjera quedan fuera del impuesto español.',
    dondeVer: 'Art. 93 LIRPF; Orden HFP/1338/2023 (aprobación del modelo 151 para 2023 y siguientes).',
  },
  pagosACuenta: {
    titulo: 'Pagos a cuenta',
    contenido:
      'Retención practicada por el pagador (24 %) y pagos fraccionados ingresados. El resultado de la declaración es la diferencia: positiva a ingresar, negativa a devolver.',
    dondeVer: 'Modelo 151, hoja de liquidación.',
  },
  tipos: {
    titulo: 'Tipos fijos del régimen',
    contenido:
      '24 % sobre los rendimientos hasta 600.000 € y 47 % sobre el exceso (mismo pagador). Sin mínimos personales ni deducciones del régimen general. El plazo coincide con el del modelo 100.',
    dondeVer: 'Cuadro informativo de tipos de retención de la AEAT (regime especial, claves 20.x).',
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
  periodo: {
    titulo: 'Periodicidad según el ejercicio (cambio oficial en 2026)',
    contenido:
      'Hasta el ejercicio 2025 el modelo 170 era una declaración informativa ANUAL de cobros con tarjeta de crédito o débito (Orden EHA/97/2010), presentada en el mes de febrero del año siguiente. Desde el ejercicio 2026 es una declaración informativa MENSUAL de cobros con cualquier tipo de tarjeta y con pagos asociados a números de teléfono móvil (Orden HAC/747/2025), presentada durante el mes natural siguiente al que se refiera.',
    dondeVer: 'Orden EHA/97/2010 (derogada) y Orden HAC/747/2025, de 27 de junio (BOE 15-7-2025).',
  },
  operacion: {
    titulo: 'Operaciones de cobro a declarar',
    contenido:
      'Se declaran los importes cobrados por el empresario o profesional adherido al sistema de gestión de cobros: número de cuenta de cobro e importe anual facturado (versión anual ≤2025) o importes cobrados por tarjeta y por pagos con móvil, mes a mes (versión mensual ≥2026).',
    ejemplos: ['Cobros con tarjeta en TPV', 'Pagos asociados a un número de teléfono móvil (desde 2026)'],
    dondeVer: 'Art. 3 y anexos de la Orden HAC/747/2025; art. 3 de la Orden EHA/97/2010.',
  },
  sujetos: {
    titulo: 'Obligados',
    contenido:
      'Empresarios o profesionales adheridos al sistema de gestión de cobros. Desde 2026 el ámbito se amplía a entidades de pago, entidades de dinero electrónico, sucursales y entidades que operan en régimen de libre prestación de servicios.',
    dondeVer: 'Disposición adicional del Plan Anual de Control Tributario 2026; art. 38 bis RGAT.',
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
  presentador: {
    titulo: 'Quién lo presenta',
    contenido:
      'EXCLUSIVAMENTE la guardería o centro de educación infantil autorizado (no los progenitores). Cada centro con NIF propio presenta su declaración; los centros públicos sin NIF propio lo hacen con el NIF del departamento titular.',
    dondeVer: 'Orden HAC/1400/2018 (mod. Orden HAC/682/2025); preguntas frecuentes de la AEAT.',
  },
  deduccion: {
    titulo: 'Vínculo con la deducción por maternidad',
    contenido:
      'Los gastos informados respaldan el incremento de la deducción por maternidad por custodia de menores de 3 años: el 25 % de los primeros 4.000 € de gastos, con un máximo de 1.000 € (art. 81.2 LIRPF).',
    ejemplos: ['4.800 € pagados → incremento máximo de 1.000 €'],
    dondeVer: 'Art. 81.2 LIRPF; art. 69.9 RIRPF.',
  },
  contenido: {
    titulo: 'Contenido y plazo',
    contenido:
      'Por cada menor: NIF, apellidos y nombre, meses completos de custodia, gastos anuales pagados e importes subvencionados. Plazo: el mes de enero en relación con el año anterior (del 1 de enero al 2 de febrero de 2026).',
    dondeVer: 'Arts. 2 a 6 de la Orden HAC/1400/2018.',
  },
}

export const GUIA_MODELO_036: Record<string, GuiaCampo> = {
  volumenOperaciones: {
    titulo: 'Volumen de operaciones',
    contenido: 'Es el importe total de las ventas o prestaciones de servicios previstas para el primer ejercicio. Determina si puedes declarar IVA en régimen simplificado (por módulos) o en régimen general.',
    ejemplos: [
      'Comercio: prevés facturar 120.000€ al año',
      'Consultor: facturas por horas, estima 90.000€',
      'Si superas 250.000€ de operaciones no puedes usar el régimen simplificado',
    ],
    dondeVer: 'Base es tu estimación de facturación del primer año de actividad.',
  },
  tipoActividad: {
    titulo: 'Tipo de actividad',
    contenido: 'Las actividades profesionales (servicios técnicos, intelectuales, artísticos: abogados, médicos, ingenieros…) deben tributar en IRPF en estimación directa y en IVA en régimen general. Las empresariales (comercio, hostelería, transporte, talleres…) pueden acogerse a módulos/IVA simplificado si no superan los límites.',
    ejemplos: [
      'Profesional colegiado → siempre IVA general',
      'Tienda o restaurante → puede optar por módulos',
    ],
    dondeVer: 'Epígrafe de IAE que elijas y normativa de módulos (Orden de módulos del Ministerio).',
  },
  baseCotizacion: {
    titulo: 'Base de cotización RETA',
    contenido: 'Es la base mensual sobre la que cotizas en el régimen de autónomos. En 2025 se cotiza por tramos según rendimientos netos; puedes elegir base dentro de los límites mínimo y máximo. Cuanto mayor sea la base, mayor será tu cotización pero también tu futura pensión.',
    ejemplos: [
      'Base mínima 2025: 1.184,10 €/mes',
      'Base máxima 2025: 4.909,50 €/mes',
      'La cuota final = base × 29,7% (2026)',
    ],
    dondeVer: 'Tabla de bases de cotización en la norma anual de cotización (BOE).',
  },
  mesesTarifaPlana: {
    titulo: 'Tarifa plana',
    contenido: 'Bonificación para nuevos autónomos: durante los primeros meses pagas una cuota reducida (80 € aprox.). Aplica si te das de alta por primera vez y cumples los requisitos. El resto del periodo cotizas la cuota íntegra por la base elegida.',
    ejemplos: [
      'Tarifa plana 12 meses: ahorro de 12 × 80 € = 960 € en el cómputo orientativo',
      'La bonificación real depende de la base elegida',
    ],
    dondeVer: 'Normativa de tarifa plana y resolución de tu mutua/seguridad social.',
  },
}

export const GUIA_PLUSVALIA: Record<string, GuiaCampo> = {
  valorCatastralTerreno: {
    titulo: 'Valor catastral del terreno',
    contenido: 'El valor catastral del suelo (no de la construcción). Lo encuentras en el recibo del IBI o en la sede electrónica del Catastro. Es la base del método objetivo de la plusvalía municipal.',
    ejemplos: [
      'Suele aparecer desglosado en el recibo del IBI como valor catastral del suelo',
    ],
    dondeVer: 'Recibo del IBI o certificado catastral del inmueble.',
  },
  anyosTenencia: {
    titulo: 'Años de tenencia',
    contenido: 'Número de años completos entre la adquisición y la transmisión del terreno. Determina el coeficiente reductor del método objetivo: cuantos más años, menor el coeficiente y, por tanto, menor la base.',
    ejemplos: [
      '5 años de tenencia → coeficiente 0,52',
      '15 años → coeficiente 0,36',
    ],
    dondeVer: 'Escritura de compra y escritura de venta.',
  },
  tipoMunicipal: {
    titulo: 'Tipo impositivo municipal',
    contenido: 'Porcentaje que aplica tu ayuntamiento sobre la base imponible (habitualmente entre el 20% y el 30%). Lo fija cada ordenanza fiscal local.',
    ejemplos: [
      'Tipo del 30% → cuota = base imponible × 0,30',
    ],
    dondeVer: 'Ordenanza fiscal del IIVTNU de tu ayuntamiento.',
  },
  metodo: {
    titulo: 'Método de cálculo',
    contenido: 'Desde la STC 59/2017 coexisten dos métodos: el objetivo (sobre valor catastral y coeficiente por años) y el real (sobre la plusvalía efectiva entre transmisión y adquisición). El contribuyente puede elegir el que resulte más favorable.',
    ejemplos: [
      'Objetivo: valor catastral del terreno × coeficiente',
      'Real: (valor transmisión − valor adquisición) × tipo',
    ],
    dondeVer: 'Liquidación del ayuntamiento; puedes alegar el método más beneficioso.',
  },
}

export const GUIA_MODELO_104: Record<string, GuiaCampo> = {
  categoria: {
    titulo: 'Situación familiar',
    contenido: 'Define el colectivo que permite la devolución acelerada del IRPF: familia numerosa (general o especial) o persona con discapacidad a cargo. Cada situación genera un mínimo personal y familiar distinto que determina el exceso de retenciones a devolver por anticipado.',
    ejemplos: [
      'Familia numerosa general → mínimo por descendientes estándar',
      'Familia numerosa especial → mínimo incrementado',
      'Persona con discapacidad a cargo → mínimo por discapacidad notablemente mayor',
    ],
    dondeVer: 'Título y categoría de tu tarjeta de familia numerosa, o certificado de discapacidad.',
  },
  numHijos: {
    titulo: 'Nº de hijos / personas a cargo',
    contenido: 'El número de hijos (para familia numerosa) o personas con discapacidad a cargo que determinan el importe del mínimo por descendientes/familiares. Cuantos más, mayor el mínimo y, en consecuencia, mayor la devolución anticipada.',
    ejemplos: [
      '3 hijos, categoría general → mínimo por descendientes de 2.400 + 2×2.700',
    ],
    dondeVer: 'Tarjeta de familia numerosa o solicitud de devolución acelerada.',
  },
  retencionesAnuales: {
    titulo: 'Retenciones de IRPF del año',
    contenido: 'Cantidad total de IRPF que te retiene tu empresa en las nóminas del ejercicio. El anticipo mensual se calcula sobre la parte que no se compensa con tu cuota y que finalmente resultaría a devolver.',
    ejemplos: [
      'Si te retienen 6.000 € y tu cuota anual es menor, el exceso es lo que puedes cobrar por adelantado',
    ],
    dondeVer: 'En tus nóminas o el resumen anual del trabajador.',
  },
  rendimientosBrutos: {
    titulo: 'Rendimientos brutos del trabajo',
    contenido: 'Tus rendimientos íntegros del trabajo anuales. Se usan para estimar la cuota anual y el exceso de mínimos que corresponde devolver, afinando el importe mensual solicitable.',
    ejemplos: [
      'Rendimientos brutos de 24.000 €',
    ],
    dondeVer: 'Nóminas anuales o la declaración de la renta del ejercicio anterior.',
  },
}

export const GUIA_MODELO_117: Record<string, GuiaCampo> = {
  periodo: {
    titulo: 'Trimestres y plazo',
    contenido:
      'Autoliquidación trimestral (enero-marzo, abril-junio, julio-septiembre y octubre-diciembre), dentro de los veinte primeros días naturales siguientes a la finalización de cada trimestre natural.',
    dondeVer: 'Orden EHA/3435/2007 (aprobación del modelo 117); RGAT.',
  },
  base: {
    titulo: 'Base de la retención: la ganancia, no el importe íntegro',
    contenido:
      'La retención del 19 % se practica sobre la ganancia patrimonial de la transmisión o reembolso (diferencia entre contraprestación y coste de adquisición). Si no hay ganancia (pérdida), no procede retención (art. 94.1.a LIRPF).',
    ejemplos: ['Reembolso de un fondo por 2.500 € con coste de 2.000 € → base 500 €, retención 95 €'],
    dondeVer: 'Art. 101.6 LIRPF y cuadro AEAT de tipos de retención (19 %).',
  },
  sujetos: {
    titulo: 'Qué rentas se declaran',
    contenido:
      'Rentas procedentes de la transmisión o reembolso de acciones o participaciones en Instituciones de Inversión Colectiva (fondos y sociedades de inversión) y de la transmisión de derechos de suscripción.',
    dondeVer: 'Denominación oficial del modelo 117 (AEAT, «Presentar y consultar declaraciones por modelo»).',
  },
}

export const GUIA_MODELO_110: Record<string, GuiaCampo> = {
  tipo: {
    titulo: 'Tipo de retención',
    contenido: 'Categoría de rendimiento que genera la retención sin modelo propio: capital inmobiliario distinto del arrendamiento de local, premios, ganancias patrimoniales no derivadas de inmuebles, retribuciones en especie u otros.',
    ejemplos: [
      'Premios de concursos o sorteos no exentos → retención a cuenta',
      'Cesión de derechos de imagen o similares → capital',
    ],
    dondeVer: 'Factura o documento del perceptor con la retención practicada.',
  },
  importe: {
    titulo: 'Importe bruto satisfecho',
    contenido: 'Base sobre la que se practica la retención (el importe íntegro del pago, sin descontar la propia retención).',
    ejemplos: [
      'Un premio de 5.000 € → base sobre la que se aplica el 19%',
    ],
    dondeVer: 'Justificante del pago o factura.',
  },
  tipoRetencion: {
    titulo: 'Tipo de retención',
    contenido: 'Porcentaje aplicado (habitualmente 19%). El tipo depende de la naturaleza de la renta y de la normativa vigente en el ejercicio.',
    ejemplos: [
      '19% sobre premios y ganancias patrimoniales',
    ],
    dondeVer: 'Factura o contrato.',
  },
  periodo: {
    titulo: 'Periodo',
    contenido: 'Las retenciones se ingresan cada trimestre (modelo 110 trimestral) y al final del año se presenta la declaración-resumen anual. Elija "anual" para el resumen de todo el ejercicio.',
    ejemplos: [
      'Trimestre 4 → ingreso hasta el 20 de enero',
      'Resumen anual → hasta el 30 de enero del año siguiente',
    ],
    dondeVer: 'Calendario del contribuyente de la AEAT.',
  },
}

export const GUIA_MODELO_211: Record<string, GuiaCampo> = {
  precioVenta: {
    titulo: 'Precio de la transmisión',
    contenido: 'Es la consideración total acordada (el precio de venta) por la adquisición del inmueble a un no residente. Sobre este importe se calcula la retención del 3% (art. 25.2 LIRNR).',
    ejemplos: [
      'Compras un piso por 200.000 € → retención de 6.000 € y neto al vendedor de 194.000 €',
    ],
    dondeVer: 'En la escritura pública de compraventa.',
  },
  tipoRetencion: {
    titulo: 'Tipo de retención',
    contenido: 'Porcentaje que se retiene sobre el precio. El general para adquisición de inmuebles a no residentes sin establecimiento permanente es el 3%.',
    ejemplos: [
      'General: 3% sobre el precio',
    ],
    dondeVer: 'Art. 25.2 LIRNR.',
  },
}

export const GUIA_MODELO_222: Record<string, GuiaCampo> = {
  modalidad: {
    titulo: 'Modalidad del pago fraccionado',
    contenido: 'El pago fraccionado del IS se calcula de dos formas: (a) modalidad de cuota (art. 40.2 LIS): el 18% de la cuota íntegra del ejercicio anterior; (b) modalidad de base (art. 40.3 LIS): se aplica un porcentaje sobre la base imponible del periodo — 17% si la cifra de negocios es inferior a 10 M€ o 24% si es igual o superior. La modalidad de base es obligatoria si la cifra de negocios supera 6 M€. El modelo 222 se usa en régimen de consolidación fiscal.',
    ejemplos: [
      'Grupo de consolidación → 222',
      'Cifra de negocios ≥ 6 M€ → modalidad de base obligatoria (17% si <10 M€, 24% si ≥10 M€)',
    ],
    dondeVer: 'Art. 40 LIS y normativa anual del modelo 222 en la sede de la AEAT.',
  },
  baseImponible: {
    titulo: 'Base imponible del periodo',
    contenido: 'En la modalidad de base, es el resultado contable del periodo ajustado (base imponible acumulada) sobre el que se aplica el tipo del pago fraccionado (17% o 24% según la cifra de negocios).',
    ejemplos: [
      'Base imponible acumulada de 100.000 € y cifra ≥ 10M → 100.000 × 24% = 24.000 € a cuenta',
      'Base imponible de 100.000 € y cifra < 10M → 100.000 × 17% = 17.000 € a cuenta',
    ],
    dondeVer: 'Cálculo de la base imponible del IS para el periodo (resultado contable + ajustes).',
  },
  cuotaIntegraAnterior: {
    titulo: 'Cuota íntegra del ejercicio anterior',
    contenido: 'En la modalidad de cuota, se toma la cuota íntegra del último periodo impositivo presentado y se le aplica el 18%.',
    ejemplos: [
      'Cuota íntegra de 20.000 € → 20.000 × 18% = 3.600 € por pago',
    ],
    dondeVer: 'Modelo 200 del ejercicio anterior, casilla de cuota íntegra.',
  },
  cifraNegocios: {
    titulo: 'Cifra de negocios',
    contenido: 'El importe neto de la cifra de negocios determina el tipo aplicable en la modalidad de base: 17% si es inferior a 10 M€ y 24% (con mínimo del 23% del resultado de la Cuenta de PyG) si es igual o superior.',
    ejemplos: [
      '≥ 10 M€ de cifra de negocios → modalidad de base al 24%',
      '< 6 M€ → puedes optar por el 18% de la cuota o el 17% de la base',
    ],
    dondeVer: 'Comercial de la sociedad del ejercicio anterior.',
  },
  pagosAnteriores: {
    titulo: 'Pagos anteriores',
    contenido: 'Cantidad ya ingresada a cuenta en pagos fraccionados anteriores del mismo ejercicio. Se resta del pago del periodo para evitar duplicidades.',
    dondeVer: 'Justificantes de los pagos fraccionados previos del ejercicio.',
  },
}

export const GUIA_MODELO_590: Record<string, GuiaCampo> = {
  cifraNegocios: {
    titulo: 'Cifra de negocios',
    contenido: 'Es el importe neto de la cifra de negocios del periodo impositivo (facturación neta de la sociedad). Determina si estás obligado a presentar el modelo 590 (si superas 250.000 € en el ejercicio y realizas operaciones vinculadas) y a elaborar documentación (a partir de 10 M€).',
    ejemplos: [
      'Sociedad con 1 M€ facturados y préstamo de un socio por 300.000 € → debe presentar el 590',
      'Cifra de negocios 8.000.000 € con operaciones vinculadas de 500.000 € → presenta 590 pero sin documentación individual (<10M)',
    ],
    dondeVer: 'Comercial de la sociedad. Lo habitual es coincidir con la línea 01 del modelo 200.',
  },
  operaciones: {
    titulo: 'Operaciones vinculadas',
    contenido: 'Son las operaciones realizadas con partes vinculadas (socios significativos, administradores, sociedades del grupo familiar, etc.). Deben valorarse a precios de mercado. Suma aquí el importe de cada una para comprobar si superas el umbral individual de 250.000 € que obliga a declararlas.',
    ejemplos: [
      'Préstamo participativo de un socio: 300.000 €',
      'Arrendamiento de local a una sociedad del mismo grupo: 60.000 €/año',
      'Venta de mercancías a una empresa familiar: 400.000 €',
    ],
    dondeVer: 'Identifica a las partes vinculadas y recopila el valor de cada operación del ejercicio.',
  },
}

export const GUIA_MODELO_390: Record<string, GuiaCampo> = {
  resumen: {
    titulo: 'Resumen anual del IVA',
    contenido: 'El modelo 390 resume las cuatro liquidaciones trimestrales del modelo 303. Se presenta en enero del año siguiente y sirve para verificar que la suma de trimestres cuadra: IVA repercutido (lo que cobraste a tus clientes) frente a IVA soportado (lo que pagaste en tus gastos), más las compensaciones intertrimestrales.',
    ejemplos: [
      'Si vendiste 100.000€ + 21% IVA, tu IVA repercutido anual será 21.000€',
      'Si tus gastos llevaron 3.000€ de IVA soportado, el resultado anual será 21.000 − 3.000 = 18.000€ a ingresar',
    ],
    dondeVer: 'Cuadro de liquidaciones del modelo 390 en la sede electrónica de la AEAT.',
  },
}

export const GUIA_MODELO_145: Record<string, GuiaCampo> = {
  salarioBrutoAnual: {
    titulo: 'Salario bruto anual',
    contenido: 'Es el total de tu retribución bruta anual por trabajar: salario base + complementos + pagas extra + horas extra. Es el dato base sobre el que la empresa calcula la retención de IRPF en la nómina.',
    ejemplos: [
      'Si tu contrato dice 26.000€ anuales distribuidos en 14 pagas, pon 26.000€',
      'Incluye horas extra y complementos, pero no las indemnizaciones por despido (exentas)',
    ],
    dondeVer: 'En tu contrato, nominas o el resumen anual del trabajador.',
  },
  numeroPagadores: {
    titulo: 'Número de pagadores',
    contenido: 'Cuántas empresas o entidades te pagan retribuciones que estén obligadas a retener IRPF. Si es tu único empleo es 1 (el caso normal). Si además cobras del SEPE, pensiones u otras prestaciones, pasa a 2 o más.',
    ejemplos: [
      'Un solo empleo a jornada completa → 1 pagador',
      'Trabajas en dos empresas o cobras paro → 2 o más',
    ],
    dondeVer: 'Recuerda cuántas empresas te retienen. Con 2+ pagadores se aplica la retención mínima de seguridad.',
  },
  hijos: {
    titulo: 'Hijos (mínimo por descendientes)',
    contenido: 'El número de hijos que generan el mínimo personal y familiar por descendientes. Reduce la base sobre la que se calcula la retención, por lo que baja el tipo. Aplica por hijos menores de 25 años que convivan y no tengan rentas anuales superiores al umbral.',
    ejemplos: [
      '1 hijo → 2.400€ de mínimo',
      '2 hijos → 2.400€ + 2.700€ = 5.100€',
      'Hijos con discapacidad suman mínimo adicional',
    ],
    dondeVer: 'Solo cuentan hijos que cumplan los requisitos del art. 58 LIRPF.',
  },
  discapacidadPct: {
    titulo: 'Discapacidad',
    contenido: 'Grado de discapacidad reconocido (≥33% o ≥65%). Genera un mínimo personal adicional que reduce la base de retención (3.000€ con grado ≥33%, más si ≥65%).',
    ejemplos: [
      'Grado ≥33% → mínimo adicional 3.000€',
      'Grado ≥65% → mínimo adicional mayor',
    ],
    dondeVer: 'Certificado del grado de discapacidad emitido por el órgano competente.',
  },
  otrosGastos: {
    titulo: 'Otros gastos deducibles',
    contenido: 'Gastos que reducen el rendimiento neto del trabajo antes de aplicar la retención: cuotas a colegios profesionales (en ciertos casos), cuotas de sindicatos, etc. En la retención anual se descuentan de la base.',
    ejemplos: [
      'Cuota anual de tu colegio profesional',
      'Cuotas sindicales',
    ],
    dondeVer: 'Justificantes de los gastos que comunices en el modelo 145.',
  },
}

export const GUIA_MODELO_206: Record<string, GuiaCampo> = {
  baseImponible: {
    titulo: 'Base imponible del ejercicio',
    contenido: 'Es el resultado positivo de la actividad de la sociedad antes de restar las bases negativas pendientes de compensación. Sobre ella se aplica el tipo de gravamen para calcular la cuota íntegra.',
    ejemplos: [
      'Beneficio de 200.000€ → base imponible 200.000€',
      'Si tuviste pérdidas, pon 0 (no hay pago fraccionado)',
    ],
    dondeVer: 'Cuenta de resultados del ejercicio corriente. Casilla 001 del modelo 200.',
  },
  tipoGravamen: {
    titulo: 'Tipo de gravamen',
    contenido: 'Porcentaje del pago fraccionado en la modalidad de base (art. 40.3 LIS): 17% (5/7 del tipo general) si la cifra de negocios es inferior a 10 M€, o 24% (19/20 del tipo general) si es igual o superior. Si la cifra de negocios supera 6 M€ esta modalidad es obligatoria; en otro caso puedes elegir la modalidad de cuota (18% de la cuota del ejercicio anterior).',
    ejemplos: [
      'General: 17% — para cifra de negocios < 10.000.000€',
      'Grandes empresas: 24% — para cifra de negocios ≥ 10.000.000€',
    ],
    dondeVer: 'Art. 40.3 de la Ley del Impuesto sobre Sociedades.',
  },
  pagosAnteriores: {
    titulo: 'Pagos fraccionados anteriores',
    contenido: 'La suma de los pagos fraccionados ya ingresados en trimestres anteriores del mismo ejercicio. Se restan de la cuota para calcular el resultado a ingresar del trimestre actual.',
    ejemplos: [
      'Si en trimestres anteriores pagaste 5.000€, pon 5.000€',
      'Si es el primer trimestre, deja en 0',
    ],
    dondeVer: 'Modelos 202/222 de trimestres anteriores del mismo ejercicio.',
  },
  compensaciones: {
    titulo: 'Compensaciones de bases negativas',
    contenido: 'Son pérdidas fiscales de ejercicios anteriores pendientes de compensar. Se restan de la base imponible antes de calcular la cuota. El límite es el 25% de la base positiva (75% para grandes empresas).',
    ejemplos: [
      'Si tienes 30.000€ de bases negativas pendientes, pon 30.000€',
      'La compensación no puede reducir la base más del 25%',
    ],
    dondeVer: 'Modelo 200 del ejercicio anterior. Hoja de bases negativas.',
  },
}

export const GUIA_MODELO_216: Record<string, GuiaCampo> = {
  nifBeneficiario: {
    titulo: 'NIF del beneficiario',
    contenido: 'El número de identificación fiscal del perceptor no residente. Puede ser NIF español (si lo tiene), NIE o número de identificación del país de residencia.',
    ejemplos: [
      'B12345678 (empresa no residente con NIF español)',
      'DE123456789 (NIF alemán)',
      'GB123456789 (NIF británico)',
    ],
    dondeVer: 'Contratos y facturas con el perceptor no residente.',
  },
  nombreBeneficiario: {
    titulo: 'Nombre del beneficiario',
    contenido: 'Nombre completo o razón social del perceptor no residente al que se le practica la retención.',
    ejemplos: [
      'Acme GmbH (empresa alemana)',
      'John Smith (persona física británica)',
    ],
    dondeVer: 'Contratos, facturas o escrituras con la contraparte.',
  },
  paisResidencia: {
    titulo: 'País de residencia',
    contenido: 'El país donde resides habitualmente. Determina el tipo de retención aplicable según los convenios de doble imposición vigentes.',
    ejemplos: [
      'Alemania: tipo general 24% (sin convenio específico)',
      'Francia: 15% por convenio de doble imposición',
      'Reino Unido: 24% (post-Brexit, sin convenio específico)',
    ],
    dondeVer: 'Certificado de residencia fiscal del perceptor.',
  },
  rentasPercibidas: {
    titulo: 'Rentas percibidas',
    contenido: 'El importe bruto de los rendimientos obtenidos por el perceptor no residente en España. Puede ser por trabajo, arrendamiento u otro concepto.',
    ejemplos: [
      'Salario de 3.000€ mensuales → 9.000€ trimestrales',
      'Alquiler de un inmueble: renta trimestral',
    ],
    dondeVer: 'Nóminas, contratos o facturas que generan la renta.',
  },
  tipoRetencion: {
    titulo: 'Tipo de retención',
    contenido: 'El porcentaje que se aplica sobre las rentas. Varía según el convenio de doble imposición con el país de residencia del perceptor.',
    ejemplos: [
      '24% general (sin convenio)',
      '15% convenio general (Alemania, Francia, Italia...)',
      '10% convenio reducido',
      '0% exento por convenio',
    ],
    dondeVer: 'Convenio de doble imposición con el país del perceptor. Art. 81-83 Reglamento IRNR.',
  },
}

export const GUIA_MODELO_231: Record<string, GuiaCampo> = {
  fecha: {
    titulo: 'Fecha de la operación',
    contenido: 'La fecha en que se realizó la operación de compraventa o canje de criptomonedas. Debe estar dentro del ejercicio fiscal que se declara.',
    ejemplos: [
      '15/03/2025 para una compra de Bitcoin',
      '20/06/2025 para una venta de Ethereum',
    ],
    dondeVer: 'Historial de transacciones del exchange o plataforma.',
  },
  tipoOperacion: {
    titulo: 'Tipo de operación',
    contenido: 'La naturaleza de la operación realizada con criptomonedas. Las compras y ventas tributan como ganancias o pérdidas patrimoniales. Los canjes (swaps) entre criptomonedas también tributan.',
    ejemplos: [
      'Compra: adquisición de criptomoneda con euros',
      'Venta: transmisión de criptomoneda por euros',
      'Cambio: canje de una criptomoneda por otra (tributa como ganancia/pérdida)',
    ],
    dondeVer: 'Historial de transacciones del exchange.',
  },
  criptomoneda: {
    titulo: 'Criptomoneda',
    contenido: 'El nombre o símbolo de la criptomoneda involucrada en la operación (BTC, ETH, SOL, etc.).',
    ejemplos: [
      'BTC (Bitcoin)',
      'ETH (Ethereum)',
      'SOL (Solana)',
    ],
    dondeVer: 'En tu wallet o exchange: activos poseídos.',
  },
  unidades: {
    titulo: 'Unidades',
    contenido: 'El número de unidades de criptomoneda compradas, vendidas o canjeadas en la operación.',
    ejemplos: [
      '0,5 BTC en una compra',
      '10 ETH en una venta',
    ],
    dondeVer: 'Historial de transacciones del exchange.',
  },
  valorEur: {
    titulo: 'Valor en euros',
    contenido: 'El valor de mercado de la operación en euros al momento de realizarse. Para ventas es el precio de venta. Para compras es el precio pagado.',
    ejemplos: [
      'Venta de 0,5 BTC a 21.000€ → valor 21.000€',
      'Compra de 10 ETH a 25.000€ → valor 25.000€',
    ],
    dondeVer: 'Historial del exchange o plataforma de trading.',
  },
  wallets: {
    titulo: 'Wallets origen y destino',
    contenido: 'Las direcciones de las wallets involucradas en la operación. La wallet de origen es de donde salen los fondos y la de destino es donde llegan.',
    ejemplos: [
      'Wallet origen: dirección de tu wallet personal',
      'Wallet destino: dirección de la wallet del exchange',
    ],
    dondeVer: 'Historial de transacciones blockchain o extracto del exchange.',
  },
}

export const GUIA_MODELO_182: Record<string, GuiaCampo> = {
  donante: {
    titulo: 'Nombre del donante',
    contenido: 'Nombre y apellidos de la persona física o jurídica que realiza la donación. Las donaciones a entidades sin fines lucrativos generan derecho a deducción en IRPF (art. 19 LIRPF).',
    ejemplos: [
      'Fundación Española del Corazón',
      'Cruz Roja Española',
      'Cáritas Diocesana',
    ],
    dondeVer: 'Justificante de la donación o recibo de la entidad.',
  },
  nifDonante: {
    titulo: 'NIF del donante',
    contenido: 'Número de Identificación Fiscal de quien dona. Es obligatorio identificar al donante en la declaración informativa.',
    ejemplos: [
      'Persona física: 12345678Z',
      'Entidad: A12345678',
    ],
    dondeVer: 'En el justificante de la donación.',
  },
  ccaaDonante: {
    titulo: 'CCAA del donante',
    contenido: 'Comunidad Autónoma donde reside el donante. La deducción autonómica varía según la CCAA: algunas aplican un 10-25% sobre la cuota estatal, otras tienen porcentajes propios.',
    ejemplos: [
      'Andalucía, Madrid, Cataluña, etc.',
      'Las deducciones autonómicas difieren en cuantía y límites',
    ],
    dondeVer: 'Domicilio fiscal del donante en el justificante.',
  },
  importeDonaciones: {
    titulo: 'Importe de la donación (€)',
    contenido: 'Cantidad total donada en euros. Solo se incluyen donaciones a entidades del art. 19 LIRPF (beneficiosas para la actividad socio-sanitaria, educativa, etc.). NO se incluyen cuotas de sociedades, herencias o legados.',
    ejemplos: [
      'Donación de 200€ a una fundación → 200€',
      'Cuota de socio de 50€ → NO se incluye',
    ],
    dondeVer: 'Justificante bancario o recibo de la entidad donataria.',
  },
}

export const GUIA_MODELO_189: Record<string, GuiaCampo> = {
  beneficiario: {
    titulo: 'Nombre del beneficiario',
    contenido: 'Nombre de la persona que recibe la renta exenta. Las rentas exentas del IRPF deben comunicarse a la AEAT por parte de las Administraciones Públicas y otros obligados.',
    ejemplos: [
      'Becario de estudios universitarios',
      'Pensionista por invalidez',
    ],
    dondeVer: 'Resolución de la entidad que concede la renta exenta.',
  },
  nif: {
    titulo: 'NIF del beneficiario',
    contenido: 'Número de Identificación Fiscal del perceptor de la renta exenta.',
    ejemplos: [
      '12345678Z',
    ],
    dondeVer: 'Documento de identidad del beneficiario.',
  },
  tipoRenta: {
    titulo: 'Tipo de renta exenta',
    contenido: 'Categoría de la renta exenta: becas, seguros de vida, invalideces, pensiones públicas, ayudas públicas u otras. Cada tipo tiene un tratamiento fiscal específico (art. 13-15 LIRPF).',
    ejemplos: [
      'Beca: exenta si es para estudios',
      'Seguro de vida: indemnización por invalidez',
      'Pensión pública: exenta si no supera ciertos límites',
    ],
    dondeVer: 'Art. 13-15 LIRPF y normativa autonómica.',
  },
  importe: {
    titulo: 'Importe de la renta exenta (€)',
    contenido: 'Cuantía total de la renta percibida exenta de IRPF. Debe indicarse el importe íntegro sin descontar gastos.',
    ejemplos: [
      'Beca de 6.000€ anuales → 6.000€',
      'Pensión por invalidez de 12.000€ → 12.000€',
    ],
    dondeVer: 'Certificado de la entidad que paga la renta exenta.',
  },
  descripcion: {
    titulo: 'Descripción',
    contenido: 'Detalle breve de la renta exenta para identificarla en la declaración informativa.',
    ejemplos: [
      'Beca de estudios en la Universidad Complutense',
      'Indemnización por accidente de tráfico',
    ],
    dondeVer: 'En la resolución o certificado de la entidad.',
  },
}

export const GUIA_MODELO_194: Record<string, GuiaCampo> = {
  baseImponible111: {
    titulo: 'Base imponible modelo 111 (€)',
    contenido: 'Suma de las bases de retención de los trimestres del modelo 111 (rendimientos del trabajo, actividades profesionales, premios, etc.). Se presenta anualmente como resumen.',
    ejemplos: [
      'Si pagaste 4.000€ de retención por nóminas → base del 111',
      'Suma de las 4 trimestrales del 111',
    ],
    dondeVer: 'En los resúmenes trimestrales del modelo 111.',
  },
  retencion111: {
    titulo: 'Retención modelo 111 (€)',
    contenido: 'Total de retenciones practicadas en el modelo 111 durante el año. Es la suma de las retenciones trimestrales ingresadas.',
    ejemplos: [
      'Retención total del 111: 4.000€',
    ],
    dondeVer: 'Justificantes de ingreso del modelo 111.',
  },
  baseImponible115: {
    titulo: 'Base imponible modelo 115 (€)',
    contenido: 'Suma de las bases de retención del modelo 115 (arrendamiento de inmuebles urbanos). Incluye todas las rentas satisfechas a arrendadores durante el año.',
    ejemplos: [
      'Alquiler mensual 800€ × 12 = 9.600€ base anual del 115',
    ],
    dondeVer: 'Contratos de alquiler y recibos de transferencia.',
  },
  retencion115: {
    titulo: 'Retención modelo 115 (€)',
    contenido: 'Total de retenciones practicadas en el modelo 115 durante el año.',
    ejemplos: [
      'Retención 19% sobre 9.600€ = 1.824€',
    ],
    dondeVer: 'Justificantes de ingreso del modelo 115.',
  },
  baseImponible117: {
    titulo: 'Base imponible modelo 117 (€)',
    contenido: 'Suma de las bases de retención del modelo 117 (premios de loterías, concursos y juegos). Si no se han presentado trimestrales, se incluye el total anual.',
    ejemplos: [
      'Premio de lotería de 1.000€ → base del 117',
    ],
    dondeVer: 'Certificados de premios de loterías y concursos.',
  },
  retencion117: {
    titulo: 'Retención modelo 117 (€)',
    contenido: 'Total de retenciones practicadas en el modelo 117 durante el año.',
    ejemplos: [
      'Retención 20% sobre premio de 1.000€ = 200€',
    ],
    dondeVer: 'Certificado de retención del organizador.',
  },
  baseImponible123: {
    titulo: 'Base imponible modelo 123 (€)',
    contenido: 'Suma de las bases de retención del modelo 123 (capital mobiliario: intereses, dividendos, arrendamientos financieros, seguros de vida, etc.).',
    ejemplos: [
      'Intereses de cuenta: 500€ → base del 123',
      'Dividendos: 1.200€ → base del 123',
    ],
    dondeVer: 'Certificados de retenciones de entidades financieras.',
  },
  retencion123: {
    titulo: 'Retención modelo 123 (€)',
    contenido: 'Total de retenciones practicadas en el modelo 123 durante el año.',
    ejemplos: [
      'Retención 19% sobre 500€ de intereses = 95€',
    ],
    dondeVer: 'Certificados de retenciones de tu banco.',
  },
}

export const GUIA_MODELO_236: Record<string, GuiaCampo> = {
  entidad: {
    titulo: 'Entidad financiera',
    contenido: 'Nombre de la entidad bancaria, aseguradora o depositaria donde se encuentra el bien o derecho en el extranjero.',
    ejemplos: ['Deutsche Bank', 'HSBC', 'UBS', 'Interactive Brokers'],
    dondeVer: 'Extracto bancario o contrato con la entidad.',
  },
  pais: {
    titulo: 'País del bien',
    contenido: 'País donde se encuentra la entidad o el inmueble. Se usa el código ISO del país.',
    ejemplos: ['Alemania: DE', 'Reino Unido: GB', 'Estados Unidos: US', 'Suiza: CH'],
    dondeVer: 'Dirección de la entidad en el extracto o escritura.',
  },
  iban: {
    titulo: 'IBAN de la cuenta',
    contenido: 'Número de cuenta internacional (IBAN) de la cuenta bancaria en el extranjero.',
    ejemplos: ['DE89 3704 0044 0532 0130 00', 'GB29 NWBK 6016 1331 9268 19'],
    dondeVer: 'Extracto bancario o tarjeta de la cuenta.',
  },
  saldoFinal: {
    titulo: 'Saldo a 31 de diciembre',
    contenido: 'Saldo de la cuenta a 31 de diciembre del año fiscal. Si el saldo del último trimestre es superior, se usa la media del último trimestre.',
    ejemplos: ['Si a 31/12 tienes 75.000€, pon 75.000€', 'Si el saldo medio del último trimestre es mayor, usa ese'],
    dondeVer: 'Extracto bancario a 31/12 o certificado anual de la entidad.',
  },
  saldoMaximo: {
    titulo: 'Saldo máximo del año',
    contenido: 'Saldo más alto alcanzado durante el año fiscal en esa cuenta.',
    ejemplos: ['Si en julio tu cuenta llegó a 120.000€, pon 120.000€'],
    dondeVer: 'Extractos mensuales o certificado de movimientos de la entidad.',
  },
  direccion: {
    titulo: 'Dirección del inmueble',
    contenido: 'Dirección completa del bien inmueble situado en el extranjero.',
    ejemplos: ['15 Downing Street, London SW1A 2AA', '123 Main St, New York, NY 10001'],
    dondeVer: 'Escritura de compraventa o contrato de alquiler.',
  },
  valorInmueble: {
    titulo: 'Valor del inmueble',
    contenido: 'Valor de adquisición o valor comprobado del inmueble en el extranjero.',
    ejemplos: ['Precio de compra en la escritura', 'Valor catastral si no hay escritura reciente'],
    dondeVer: 'Escritura de compraventa o certificado catastral.',
  },
  valorFinal: {
    titulo: 'Valor a 31 de diciembre',
    contenido: 'Valor o cotización del valor o participación a 31 de diciembre del año fiscal.',
    ejemplos: ['Cotización de la acción a 31/12 × número de participaciones'],
    dondeVer: 'Certificado de valores o extracto de bróker.',
  },
  capital: {
    titulo: 'Capital o valor del seguro',
    contenido: 'Capital asegurado o valor del contrato de seguro de vida o renta vitalicia a 31 de diciembre.',
    ejemplos: ['Capital del seguro de vida: 100.000€', 'Valor acumulado de renta vitalicia'],
    dondeVer: 'Certificado de la aseguradora o póliza.',
  },
}

export const GUIA_MODELO_282: Record<string, GuiaCampo> = {
  razonSocial: {
    titulo: 'Razón social',
    contenido: 'Nombre oficial de la entidad sometida al régimen de transparencia fiscal.',
    ejemplos: ['Fondo de Inversión XYZ, SICAV Europa, ETF Global'],
    dondeVer: 'Escritura de constitución o registro de la entidad.',
  },
  nif: {
    titulo: 'NIF de la entidad',
    contenido: 'Número de Identificación Fiscal de la entidad transparente.',
    ejemplos: ['B12345678', 'A87654321'],
    dondeVer: 'Certificado fiscal o documento oficial de la entidad.',
  },
  tipoEntidad: {
    titulo: 'Tipo de entidad',
    contenido: 'Clasificación de la entidad according to the type of collective investment vehicle.',
    ejemplos: ['Fondo de inversión', 'SICAV', 'FICVM', 'SOCIMI'],
    dondeVer: 'Estatutos de la entidad o registro oficial.',
  },
  tipoRenta: {
    titulo: 'Tipo de renta',
    contenido: 'Naturaleza de la renta imputada por la entidad transparente.',
    ejemplos: ['Dividendos', 'Intereses', 'Plusvalías', 'Rentas de arrendamiento'],
    dondeVer: 'Certificado anual de la entidad o informe de gestores.',
  },
  importeRenta: {
    titulo: 'Importe de la renta',
    contenido: 'Importe bruto de la renta imputada en céntimos.',
    ejemplos: ['Dividendos recibidos: 5.000€', 'Plusvalías realizadas: 3.200€'],
    dondeVer: 'Certificado de retenciones o informe anual de la entidad.',
  },
  sociedad: {
    titulo: 'Sociedad participada',
    contenido: 'Nombre de la sociedad en la que se tiene participación.',
    ejemplos: ['Empresa ABC, S.L.', 'Corporación XYZ, Inc.'],
    dondeVer: 'Escritura de constitución o pactos de socios.',
  },
  porcentaje: {
    titulo: 'Porcentaje de participación',
    contenido: 'Porcentaje de participación en el capital o derechos de voto de la sociedad.',
    ejemplos: ['25%', '100%', '15.5%'],
    dondeVer: 'Escritura de constitución o registro mercantil.',
  },
}

export const GUIA_MODELO_715: Record<string, GuiaCampo> = {
  tipo: {
    titulo: 'Tipo de inversión',
    contenido: 'Clasificación de la inversión en el extranjero según su naturaleza.',
    ejemplos: ['Valores: acciones, bonos, participaciones de fondos', 'Participaciones: capital social de empresas', 'Muebles: bienes muebles de uso o arrendamiento'],
    dondeVer: 'Extracto de bróker o escritura de compraventa.',
  },
  entidad: {
    titulo: 'Entidad o depositario',
    contenido: 'Nombre de la entidad financiera o depositario donde se custodia la inversión.',
    ejemplos: ['Interactive Brokers', 'Deutsche Bank', 'Vanguard'],
    dondeVer: 'Extracto bancario o contrato con la entidad.',
  },
  pais: {
    titulo: 'País de la inversión',
    contenido: 'País donde se encuentra la entidad depositaria o el bien.',
    ejemplos: ['Estados Unidos: US', 'Reino Unido: GB', 'Alemania: DE'],
    dondeVer: 'Dirección de la entidad en el extracto.',
  },
  fechaAdquisicion: {
    titulo: 'Fecha de adquisición',
    contenido: 'Fecha en que se adquirió la inversión. Se usa para calcular ganancias o pérdidas patrimoniales.',
    ejemplos: ['2020-03-15', '2019-07-01'],
    dondeVer: 'Ticket de compra o contrato de compraventa.',
  },
  valorAdquisicion: {
    titulo: 'Valor de adquisición',
    contenido: 'Importe pagado por la inversión en el momento de su compra, incluyendo gastos.',
    ejemplos: ['Precio de compra + comisiones + impuestos'],
    dondeVer: 'Ticket de compra o escritura de compraventa.',
  },
  valorActual: {
    titulo: 'Valor actual a 31 de diciembre',
    contenido: 'Valor de mercado de la inversión a 31 de diciembre del año fiscal.',
    ejemplos: ['Cotización de la acción a 31/12 × número de participaciones', 'Valor liquidativo del fondo a 31/12'],
    dondeVer: 'Extracto de bróker o certificado de la entidad.',
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
    modelo036: GUIA_MODELO_036,
    modelo145: GUIA_MODELO_145,
  modelo390: GUIA_MODELO_390,
  modelo222: GUIA_MODELO_222,
  modelo211: GUIA_MODELO_211,
  modelo143: GUIA_MODELO_143,
  modelo117: GUIA_MODELO_117,
  modelo182: GUIA_MODELO_182,
  modelo189: GUIA_MODELO_189,
  modelo194: GUIA_MODELO_194,
  modelo236: GUIA_MODELO_236,
  modelo282: GUIA_MODELO_282,
  modelo216: GUIA_MODELO_216,
}
  return guias[seccion]?.[campo] ?? null
}

export const GUIA_MODELO_143: Record<string, GuiaCampo> = {
  concepto: {
    titulo: 'Conceptos con abono anticipado',
    contenido:
      'Familia numerosa (general o especial), ascendiente separado legalmente o sin vínculo con dos hijos y personas con discapacidad (≥ 33 %) a cargo o el propio contribuyente. Cuantías: 1.200 €/año (100 €/mes) y 2.400 €/año (200 €/mes) en familia numerosa especial. Los distintos derechos son acumulables.',
    dondeVer: 'Arts. 68.2 y 81.bis LIRPF; procedimiento G613 de la AEAT.',
  },
  modo: {
    titulo: 'Modalidad individual o colectiva',
    contenido:
      'Individual: el abono lo practica el pagador (nómina o pensión) según los datos comunicados. Colectiva: la AEAT ingresa el importe directamente, compatible con lo abonado por el pagador.',
    dondeVer: 'Modelo 143, solicitud de abono anticipado.',
  },
}
