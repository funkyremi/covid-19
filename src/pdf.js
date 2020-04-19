import { PDFDocument, StandardFonts } from 'pdf-lib';

function idealFontSize (font, text, maxWidth, minSize, defaultSize) {
  let currentSize = defaultSize
  let textWidth = font.widthOfTextAtSize(text, defaultSize)
  while (textWidth > maxWidth && currentSize > minSize) {
    textWidth = font.widthOfTextAtSize(text, --currentSize)
  }
  return (textWidth > maxWidth) ? null : currentSize
}

function drawText(text, x, y, size = 11) {
  page1.drawText(text, { x, y, size, font });
}

async function generateQR(text) {
  try {
    var opts = {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
    }
    return await QRCode.toDataURL(text, opts)
  } catch (err) {
    console.error(err)
  }
}

export async function generatePdf(profile, motif) {
  const creationDate = new Date().toLocaleDateString("fr-FR");
  const creationHour = new Date()
    .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    .replace(":", "h");

  const { prenom, nom, dateDeNaissance, lieuDeNaissance, addresse, ville, codePostal } = profile;
  const existingPdfBytes = await fetch('/certificate.pdf').then(res => res.arrayBuffer());
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page1 = pdfDoc.getPages()[0];

  drawText(`${firstname} ${lastname}`, 123, 686);
  drawText(birthday, 123, 661);
  drawText(lieunaissance, 92, 638);
  drawText(`${address} ${zipcode} ${town}`, 134, 613);
  drawText(...motif.position);
  drawText(profile.town, 111, 226, idealFontSize(font, profile.town, 83, 7, 11) || 7);
  drawText(profile.datesortie, 92, 200);
  drawText(releaseHours, 200, 201);
  drawText(releaseMinutes, 220, 201);
  drawText("Date de création:", 464, 150, 7);
  drawText(`${creationDate} à ${creationHour}`, 455, 144, 7);

  const dataForQrCode = [
    `Cree le: ${creationDate} a ${creationHour}`,
    `Nom: ${nom}`,
    `Prenom: ${prenom}`,
    `Naissance: ${dateDeNaissance} a ${lieuDeNaissance}`,
    `Adresse: ${addresse} ${codePostal} ${ville}`,
    `Sortie: ${creationDate} a ${creationHour}`,
    `Motifs: ${motif.text}`
  ].join("; ");
  const generatedQR = await generateQR(dataForQrCode);
  const qrImage = await pdfDoc.embedPng(generatedQR);
  page1.drawImage(qrImage, {
    x: page1.getWidth() - 170,
    y: 155,
    width: 100,
    height: 100
  });

  pdfDoc.addPage();

  const page2 = pdfDoc.getPages()[1];
  page2.drawImage(qrImage, {
    x: 50,
    y: page2.getHeight() - 350,
    width: 300,
    height: 300
  });

  const pdfBytes = await pdfDoc.save();

  return new Blob([pdfBytes], { type: "application/pdf" });
}
