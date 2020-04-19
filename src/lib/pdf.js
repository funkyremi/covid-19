import { PDFDocument, StandardFonts } from "pdf-lib";
// import QRCode from 'qrcode'

function idealFontSize(font, text, maxWidth, minSize, defaultSize) {
  let currentSize = defaultSize;
  let textWidth = font.widthOfTextAtSize(text, defaultSize);
  while (textWidth > maxWidth && currentSize > minSize) {
    textWidth = font.widthOfTextAtSize(text, --currentSize);
  }
  return textWidth > maxWidth ? null : currentSize;
}

function drawText(page, font, text, x, y, size = 11) {
  page.drawText(text || '', { x, y, size, font });
}

async function generateQR(text) {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: "M",
      type: "image/png",
      quality: 0.92,
      margin: 1
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
    codePostal
  } = profile;
  const existingPdfBytes = await fetch("/certificate.pdf").then(res => 
    res.arrayBuffer()
  );
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page1 = pdfDoc.getPages()[0];
  drawText(page1, font, `${prenom} ${nom}`, 123, 686);
  drawText(page1, font, dateDeNaissance, 123, 661);
  drawText(page1, font, lieuDeNaissance, 92, 638);
  drawText(page1, font, `${addresse} ${codePostal} ${ville}`, 134, 613);
  drawText(page1, font, ...settings.selectedReason.position);
  drawText(page1, font, 
    profile.ville,
    111,
    226,
    idealFontSize(font, profile.ville, 83, 7, 11) || 7
  );
  drawText(page1, font, creationDate, 92, 200);
  drawText(page1, font, creationHour.substring(0, 2), 200, 201);
  drawText(page1, font, creationHour.substring(3, 5), 220, 201);
  drawText(page1, font, "Date de création:", 464, 150, 7);
  drawText(page1, font, `${creationDate} à ${creationHour}`, 455, 144, 7);

  const dataForQrCode = [
    `Cree le: ${creationDate} a ${creationHour}`,
    `Nom: ${nom}`,
    `Prenom: ${prenom}`,
    `Naissance: ${dateDeNaissance} a ${lieuDeNaissance}`,
    `Adresse: ${addresse} ${codePostal} ${ville}`,
    `Sortie: ${creationDate} a ${creationHour}`,
    `Motif: ${settings.selectedReason.shortText}`
  ].join("; ");
  // const generatedQR = await generateQR(dataForQrCode);
  // const qrImage = await pdfDoc.embedPng(generatedQR);
  // page1.drawImage(qrImage, {
  //   x: page1.getWidth() - 170,
  //   y: 155,
  //   width: 100,
  //   height: 100
  // });

  // pdfDoc.addPage();

  // const page2 = pdfDoc.getPages()[1];
  // page2.drawImage(qrImage, {
  //   x: 50,
  //   y: page2.getHeight() - 350,
  //   width: 300,
  //   height: 300
  // });

  const pdfBytes = await pdfDoc.save();

  return new Blob([pdfBytes], { type: "application/pdf" });
}
