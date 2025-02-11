import express from 'express'
import * as controllers from '../controllers/adminStaffs.controllers.js'

const router = express.Router()

//POST
router.post('/del', controllers.dele);


//GET
router.get('/get', controllers.gete);




export default router