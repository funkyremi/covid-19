import { PDFDocument, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

function idealFontSize(font, text, maxWidth, minSize, defaultSize) {
  let currentSize = defaultSize;
  let textWidth = font.widthOfTextAtSize(text, defaultSize);
  while (textWidth > maxWidth && currentSize > minSize) {
    textWidth = font.widthOfTextAtSize(text, --currentSize);
  }
  return textWidth > maxWidth ? null : currentSize;
}

function drawText(page, font, text, x, y, size = 11) {
  page.drawText(text || "", { x, y, size, font });
}

async function generateQR(text) {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: "M",
      type: "image/png",
      quality: 0.92,
      margin: 1,
    });
  } catch (err) {
    console.error(err);
  }
}

export async function generatePdf(profile, settings) {
  const baseTime = new Date();
  baseTime.setMinutes(baseTime.getMinutes() - settings.createdXMinutesAgo);
  const creationDate = baseTime.toLocaleDateString("fr-FR");
  const creationHour = baseTime
    .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    .replace(":", "h");

  const {
    prenom,
    nom,
    dateDeNaissance,
    lieuDeNaissance,
    addresse,
    ville,
    codePostal,
  } = profile;
  const existingPdfBytes = await fetch("certificate.pdf").then((res) =>
    res.arrayBuffer()
  );
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  pdfDoc.setTitle("COVID-19 - Déclaration de déplacement");
  pdfDoc.setSubject("Attestation de déplacement dérogatoire");
  pdfDoc.setKeywords([
    "covid19",
    "covid-19",
    "attestation",
    "déclaration",
    "déplacement",
    "officielle",
    "gouvernement",
  ]);
  pdfDoc.setProducer("DNUM/SDIT");
  pdfDoc.setCreator("");
  pdfDoc.setAuthor("Ministère de l'intérieur");

  const page1 = pdfDoc.getPages()[0];

  drawText(page1, font, `${prenom} ${nom}`, 107, 657);
  drawText(page1, font, dateDeNaissance, 107, 627);
  drawText(page1, font, lieuDeNaissance, 240, 627);
  drawText(page1, font, `${addresse} ${codePostal} ${ville}`, 124, 596);

  drawText(
    page1,
    font,
    profile.ville,
    93,
    122,
    idealFontSize(font, profile.ville, 83, 7, 11) || 7
  );
  drawText(page1, font, `${creationDate}`, 76, 92, 11);
  drawText(page1, font, `${creationHour}`, 246, 92, 11);

  drawText(page1, font, ...settings.selectedReason.position);

  const dataForQrCode = [
    `Cree le: ${creationDate} a ${creationHour}`,
    `Nom: ${nom}`,
    `Prenom: ${prenom}`,
    `Naissance: ${dateDeNaissance} a ${lieuDeNaissance}`,
    `Adresse: ${addresse} ${codePostal} ${ville}`,
    `Sortie: ${creationDate} a ${creationHour}`,
    `Motif: ${settings.selectedReason.code}`,
    "",
  ].join(";\n");
  const qrTitle1 = 'QR-code contenant les informations ';
  const qrTitle2 = 'de votre attestation numérique';
  const generatedQR = await generateQR(dataForQrCode);
  const qrImage = await pdfDoc.embedPng(generatedQR);
  page1.drawText(qrTitle1 + '\n' + qrTitle2, { x: 415, y: 135, size: 9, font, lineHeight: 10 })
  page1.drawImage(qrImage, {
    x: page1.getWidth() - 156,
    y: 25,
    width: 92,
    height: 92,
  });
  if (profile.signature) {
    const signature = await pdfDoc.embedPng(profile.signature);
    page1.drawImage(signature, {
      x: 120,
      y: 20,
      width: 100,
      height: 40,
    });
  }
  pdfDoc.addPage();

  const page2 = pdfDoc.getPages()[1];
  drawText(page2, font, qrTitle1 + qrTitle2, 50, page2.getHeight() - 70, 11);
  page2.drawImage(qrImage, {
    x: 50,
    y: page2.getHeight() - 390,
    width: 300,
    height: 300,
  });

  const pdfBytes = await pdfDoc.save();

  return new Blob([pdfBytes], { type: "application/pdf" });
}
