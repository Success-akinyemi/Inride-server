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

        // Check for Voter's Card
        if (
            frontText.data.text.includes("VOTER'S CARD") && 
            frontText.data.text.includes('VIN') &&
            frontText.data.text.includes('FEDERAL REPUBLIC OF NIGERIA') && 
            backText.data.text.includes('SERIAL NO.')
        ) {
            return { success: true, cardType: 'Voter\'s Card', photo: frontImageBuffer };
        }

        // Check for International Passport
        if (
            frontText.data.text.includes("INTERNATIONAL PASSPORT") &&
            frontText.data.text.includes("PASSPORT NUMBER") &&
            frontText.data.text.includes("ISSUE DATE") &&
            frontText.data.text.includes("COUNTRY")
        ) {
            return { success: true, cardType: 'International Passport', photo: frontImageBuffer };
        }

        // Check for National ID
        if (
            frontText.data.text.includes("NATIONAL ID") &&
            frontText.data.text.includes("NIN") &&
            backText.data.text.includes("SERIAL NO.")
        ) {
            return { success: true, cardType: 'National ID', photo: frontImageBuffer };
        }

        // Check for Driver's License
        if (
            frontText.data.text.includes("DRIVER'S LICENSE") &&
            frontText.data.text.includes("LICENSE NO.") &&
            frontText.data.text.includes("EXPIRATION DATE") &&
            backText.data.text.includes("LICENSE HOLDER")
        ) {
            return { success: true, cardType: 'Driver\'s License', photo: frontImageBuffer };
        }

        return { success: false, message: 'Invalid card type' };
    } catch (error) {
        console.log('Error during ID verification:', error);
        return { success: false, message: 'An error occurred during verification' };
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
            console.log('FACE MATCHED')
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

export async function verifyDriverLicense(frontFile, backFile) {
    try {
        const frontImageBuffer = await sharp(frontFile.buffer).resize(1024).toFormat('jpeg').toBuffer();
        const backImageBuffer = await sharp(backFile.buffer).resize(1024).toFormat('jpeg').toBuffer();

        const frontText = await Tesseract.recognize(frontImageBuffer, 'eng');
        const backText = await Tesseract.recognize(backImageBuffer, 'eng');

        // Validate driver's license specific details
        if (
            frontText.data.text.includes("DRIVER'S LICENSE") && // Check for the presence of driver's license text
            frontText.data.text.includes('LICENSE NO.') && // License number
            frontText.data.text.includes('EXPIRATION DATE') && // Expiration date
            frontText.data.text.includes('DATE OF BIRTH') && // Date of birth
            backText.data.text.includes('LICENSE HOLDER') && // License holder name or address
            backText.data.text.includes('ISSUING STATE') // Issuing state or country
        ) {
            return { success: true, photo: frontImageBuffer };
        }
        return { success: false };
    } catch (error) {
        console.log('Error during license verification:', error);
        return { success: false };
    }
}
