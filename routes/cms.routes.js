
import express from 'express'
import * as controllers from '../controllers/cms.controllers.js'
import { AuthenticateAdmin, UserRole, VerifyAdminAccount } from '../middlewares/auth.js'
import { uploadImages } from '../middlewares/multer.js'

const router = express.Router()


router.use(AuthenticateAdmin, VerifyAdminAccount, UserRole(['cms', 'admin', 'superadmin']));
//POST 
router.post('/newCms', uploadImages, controllers.newCms)
router.post('/updateCms', uploadImages, controllers.updateCms)
router.post('/deleteCms', controllers.deleteCms)



//GET
router.get('/getACms/:cmsId', controllers.getACms)
router.get('/getAllCms', controllers.getAllCms)





export default router