import { sendResponse } from "../middlewares/utils.js"
import AboutModel from "../model/About.js"
import AppSettingsModel from "../model/AppSettings.js"
import appSettingsModel from "../model/AppSettings.js"
import FaqModel from "../model/Faq.js"

export async function handleappSettings(req, res) {
    const { pricePerKm, name, currency, cancelationRidePercent, deliveryPricePerKm } = req.body
    try {
        let getAppSettings
        getAppSettings = await appSettingsModel.findOne()
        if(getAppSettings){
            if(pricePerKm) getAppSettings.pricePerKm = pricePerKm
            if(name) getAppSettings.name =  name
            if(currency) getAppSettings.currency = currency
            if(cancelationRidePercent) getAppSettings.cancelationRidePercent = cancelationRidePercent
            if(deliveryPricePerKm) getAppSettings.deliveryPricePerKm = deliveryPricePerKm, deliveryPricePerKm
            
            await getAppSettings.save()
        } else {
            getAppSettings = await appSettingsModel.create({
                pricePerKm, name, currency, cancelationRidePercent,
            })
        }

        return sendResponse(res, 200, true, 'Settings updated successful', getAppSettings)
    } catch (error) {
        console.log('UNABLE TO HANDLE SETTINGS UPDATE', error)
        return sendResponse(res, 500, false, 'Unable to update app settings')
    }
}

export async function getAppSettings(req, res) {
    try {
        const appSettings = await AppSettingsModel.findOne()

        sendResponse(res, 200, true, appSettings)
    } catch (error) {
        console.log('UNABLE TO GET APP SETTINGS', error)
        sendResponse(res, 500, false, 'Unable to get app settings')
    }
}

// CREATE NEW FAQ
export async function createFaq(req, res){
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      return sendResponse(res, 400, false, "Question and Answer are required.");
    }

    let faqEntry = await FaqModel.findOne();
    if (!faqEntry) {
      faqEntry = new FaqModel({ faq: [] });
    }

    faqEntry.faq.push({ question, answer });
    await faqEntry.save();

    sendResponse(res, 201, true, "FAQ added successfully.", faqEntry);
  } catch (error) {
    console.error("Error adding FAQ:", error);
    sendResponse(res, 500, false, "Server error while adding FAQ.");
  }
};

// UPDATE FAQ
export async function updateFaq(req, res){
  try {
    const { faqId } = req.params; // ID of the FAQ inside the array
    const { question, answer } = req.body;

    const faqEntry = await FaqModel.findOne();
    if (!faqEntry) {
      return sendResponse(res, 404, false, "FAQ list not found.");
    }

    const faqToUpdate = faqEntry.faq.id(faqId);
    if (!faqToUpdate) {
      return sendResponse(res, 404, false, "FAQ not found.");
    }

    if (question) faqToUpdate.question = question;
    if (answer) faqToUpdate.answer = answer;

    await faqEntry.save();
    sendResponse(res, 200, true, "FAQ updated successfully.", faqToUpdate);
  } catch (error) {
    console.error("Error updating FAQ:", error);
    sendResponse(res, 500, false, "Server error while updating FAQ.");
  }
};

// DELETE FAQ
export async function deleteFaq(req, res){
  try {
    const { faqId } = req.params; // ID of the FAQ inside the array

    const faqEntry = await FaqModel.findOne();
    if (!faqEntry) {
      return sendResponse(res, 404, false, "FAQ list not found.");
    }

    const faqIndex = faqEntry.faq.findIndex((faq) => faq._id.toString() === faqId);
    if (faqIndex === -1) {
      return sendResponse(res, 404, false, "FAQ not found.");
    }

    faqEntry.faq.splice(faqIndex, 1);
    await faqEntry.save();

    sendResponse(res, 200, true, "FAQ deleted successfully.");
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    sendResponse(res, 500, false, "Server error while deleting FAQ.");
  }
};

// GET ALL FAQ
export async function getFaqs(req, res){
  try {
    const faqEntry = await FaqModel.findOne();
    if (!faqEntry || faqEntry.faq.length === 0) {
      return sendResponse(res, 404, false, "No FAQs found.");
    }
    sendResponse(res, 200, true, "FAQs retrieved successfully.", faqEntry.faq);
  } catch (error) {
    console.error("Error retrieving FAQs:", error);
    sendResponse(res, 500, false, "Server error while retrieving FAQs.");
  }
};

//ABOUT
export async function updateAbout(req, res){
    try {
      const { about } = req.body;
  
      if (!about) {
        return sendResponse(res, 400, false, "About content is required.");
      }
  
      let aboutEntry = await AboutModel.findOne();
  
      if (!aboutEntry) {
        // Create a new document if none exists
        aboutEntry = new AboutModel({ about });
      } else {
        // Update the existing document
        aboutEntry.about = about;
      }
  
      await aboutEntry.save();
  
      sendResponse(res, 200, true, "About section updated successfully.", aboutEntry);
    } catch (error) {
      console.error("Error updating About section:", error);
      sendResponse(res, 500, false, "Server error while updating About section.");
    }
  };  

  export async function getAbout(req, res){
    try {
      const aboutEntry = await AboutModel.findOne();
  
      if (!aboutEntry) {
        return sendResponse(res, 404, false, "About section not found.");
      }
  
      sendResponse(res, 200, true, "About section retrieved successfully.", aboutEntry);
    } catch (error) {
      console.error("Error retrieving About section:", error);
      sendResponse(res, 500, false, "Server error while retrieving About section.");
    }
  };