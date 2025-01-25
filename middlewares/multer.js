import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({ storage });

export const uploadImages = upload.fields([
    { name: "image", maxCount: 1 }, // For single event image
    { name: "idCardImgFront", maxCount: 1 }, // For single event id card front image
    { name: "idCardImgBack", maxCount: 1 }, // For single event id card back image   
    { name: "profileImg", maxCount: 1 }, // For single event profile image
    { name: "driverLincenseImgFront", maxCount: 1 }, // For single event driver lincense front image
    { name: "driverLincenseImgBack", maxCount: 1 }, // For single event driver lincense back image
    { name: "carImg", maxCount: 1 }, // For single event car image
    { name: "eventGallery", maxCount: 10 }, // For multiple gallery images
]);
