
import express from 'express'
import * as controllers from '../controllers/cms.controllers.js'
import { AuthenticateAdmin, VerifyAdminAccount } from '../middlewares/auth.js'
import { uploadImages } from '../middlewares/multer.js'

const router = express.Router()

//POST 
router.post('/newCms', AuthenticateAdmin, VerifyAdminAccount, uploadImages, controllers.newCms)
router.post('/updateCms', AuthenticateAdmin, VerifyAdminAccount, uploadImages, controllers.updateCms)
router.post('/deleteCms', AuthenticateAdmin, VerifyAdminAccount, controllers.deleteCms)



//GET
router.get('/getACms/:cmsId', AuthenticateAdmin, VerifyAdminAccount, controllers.getACms)
router.get('/getAllCms', AuthenticateAdmin, VerifyAdminAccount, controllers.getAllCms)





export default router