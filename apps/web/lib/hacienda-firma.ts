export interface CertificadoInfo {
  alias: string
  emisor: string
  sujeto: string
  fechaInicio: string
  fechaFin: string
  numeroSerie: string
  algoritmo: string
}

export interface FirmaResult {
  firmaBase64: string
  algoritmo: string
  timestamp: string
  certificado: CertificadoInfo
}

// OID constants for PKCS#12 bag types
const OID_CERT_BAG = '1.2.840.113549.1.12.10.1.3'
const OID_KEY_BAG = '1.2.840.113549.1.12.10.1.2'

export async function leerCertificado(
  archivo: File,
  password: string
): Promise<CertificadoInfo> {
  const buffer = await archivo.arrayBuffer()

  const forge = await import('node-forge')
  const p12Der = new Uint8Array(buffer)
  const p12Asn1 = forge.asn1.fromDer(forge.util.binary.raw.encode(p12Der))
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password)

  const certBags = p12.getBags({ bagType: OID_CERT_BAG })
  const cert = certBags[OID_CERT_BAG]?.[0]?.cert

  if (!cert) {
    throw new Error('No se encontró ningún certificado en el archivo')
  }

  return {
    alias: cert.subject.getField('CN')?.value ?? 'Sin alias',
    emisor: cert.issuer.getField('CN')?.value ?? cert.issuer.getField('O')?.value ?? 'Desconocido',
    sujeto: cert.subject.getField('CN')?.value ?? '',
    fechaInicio: cert.validity.notBefore.toISOString(),
    fechaFin: cert.validity.notAfter.toISOString(),
    numeroSerie: cert.serialNumber,
    algoritmo: cert.siginfo?.algorithmOid ?? 'SHA-256',
  }
}

export async function firmarDatos(
  datos: string,
  archivoCertificado: File,
  password: string
): Promise<FirmaResult> {
  const forge = await import('node-forge')
  const buffer = await archivoCertificado.arrayBuffer()

  const p12Der = new Uint8Array(buffer)
  const p12Asn1 = forge.asn1.fromDer(forge.util.binary.raw.encode(p12Der))
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password)

  const keyBags = p12.getBags({ bagType: OID_KEY_BAG })
  const privateKey = keyBags[OID_KEY_BAG]?.[0]?.key

  if (!privateKey) {
    throw new Error('No se encontró la clave privada en el certificado')
  }

  const certBags = p12.getBags({ bagType: OID_CERT_BAG })
  const cert = certBags[OID_CERT_BAG]?.[0]?.cert

  if (!cert) {
    throw new Error('No se encontró el certificado')
  }

  const md = forge.md.sha256.create()
  md.update(datos, 'utf8')

  const p7 = forge.pkcs7.createSignedData()
  p7.content = forge.util.createBuffer(datos, 'utf8')
  p7.addCertificate(cert)
  p7.addSigner({
    key: privateKey,
    certificate: cert,
    digestAlgorithm: '2.16.840.1.101.3.4.2.1',
  })
  p7.sign()

  const signedAsn1 = p7.toAsn1()
  const signedDer = forge.asn1.toDer(signedAsn1).getBytes()
  const signedBase64 = forge.util.encode64(signedDer)

  return {
    firmaBase64: signedBase64,
    algoritmo: 'SHA-256 con RSA',
    timestamp: new Date().toISOString(),
    certificado: {
      alias: cert.subject.getField('CN')?.value ?? '',
      emisor: cert.issuer.getField('CN')?.value ?? '',
      sujeto: cert.subject.getField('CN')?.value ?? '',
      fechaInicio: cert.validity.notBefore.toISOString(),
      fechaFin: cert.validity.notAfter.toISOString(),
      numeroSerie: cert.serialNumber,
      algoritmo: 'SHA-256',
    },
  }
}

export async function verificarFirma(
  datos: string,
  firmaBase64: string
): Promise<boolean> {
  try {
    const forge = await import('node-forge')
    const derBytes = forge.util.decode64(firmaBase64)
    const asn1 = forge.asn1.fromDer(derBytes)
    const p7 = forge.pkcs7.messageFromAsn1(asn1)

    const signerInfo = p7.rawCapture?.signerInfos
    if (!signerInfo) return false

    const signedData = p7.rawCapture?.content
    if (!signedData) return false

    return true
  } catch {
    return false
  }
}

export function esCertificadoValido(info: CertificadoInfo): boolean {
  const ahora = new Date()
  const fechaFin = new Date(info.fechaFin)
  return fechaFin > ahora
}
