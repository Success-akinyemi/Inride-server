import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import AWS from 'aws-sdk';

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: 'us-east-1'
});

const rekognition = new AWS.Rekognition();

export async function verifyID(frontFile, backFile) {
    try {
        const frontImageBuffer = await sharp(frontFile.buffer).resize(1024).toFormat('jpeg').toBuffer();
        const backImageBuffer = await sharp(backFile.buffer).resize(1024).toFormat('jpeg').toBuffer();

        const frontText = await Tesseract.recognize(frontImageBuffer, 'eng');
        const backText = await Tesseract.recognize(backImageBuffer, 'eng');

        if (frontText.data.text.includes("VOTER'S CARD") && frontText.data.text.includes('VIN') && frontText.data.text.includes('FEDERAL REPUBLIC OF NIGERIA') && backText.data.text.includes('SERIAL NO.')) {
            return { success: true, photo: frontImageBuffer };
        }
        return { success: false };
    } catch (error) {
        console.log('Error during ID verification:', error);
        return { success: false };
    }
}

export async function matchFace(idPhotoBuffer, selfieBuffer) {
    if (!idPhotoBuffer || idPhotoBuffer.length === 0 || !selfieBuffer || selfieBuffer.length === 0) {
        return { success: false, error: 'Empty or invalid image buffers provided.' };
    }
    try {
        const params = {
            SourceImage: { Bytes: idPhotoBuffer },
            TargetImage: { Bytes: selfieBuffer },
            SimilarityThreshold: 80
        };

        const result = await rekognition.compareFaces(params).promise();

        if (result.FaceMatches && result.FaceMatches.length > 0) {
            return { success: true, similarity: result.FaceMatches[0].Similarity };
        } else {
            console.log('FACE DID NOT MATCH')
            return { success: false };
        }
    } catch (error) {
        console.error('Error during face matching:', error);
        return { success: false, error: error.message, code: error.code };
    }
}
