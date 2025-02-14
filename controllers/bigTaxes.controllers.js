import { sendResponse } from "../middlewares/utils.js"
import BigTaxesModel from "../model/BigTaxes.js"

//NEW BIG TAXES
export async function newBigTaxes(req, res) {
    const { stationName, price, from, to, miles, time, fromDescription, toDescription } = req.body
    if(!stationName){
        return sendResponse(res, 400, false, 'Station name is required')
    }
    if(!price){
        return sendResponse(res, 400, false, 'Price is required')
    }
    if(isNaN(price)){
        return sendResponse(res, 400, false, 'Price must be a valid number')
    }
    if(!from){
        return sendResponse(res, 400, false, 'from is required')
    }
    if(!to){
        return sendResponse(res, 400, false, 'to is required')
    }
    if(!miles){
        return sendResponse(res, 400, false, 'Miles is required')
    }
    if(isNaN(miles)){
        return sendResponse(res, 400, false, 'Miles must be a valid number')
    }
    if(!time){
        return sendResponse(res, 400, false, 'time is required')
    }
    try {
        const newTax = await BigTaxesModel.create({
            stationName,
            price,
            from,
            to,
            miles,
            time,
            fromDescription,
            toDescription
        })

        sendResponse(res, 201, true, 'Big taxes created succesful')
    } catch (error) {
        console.log('UNABLE TO CREATE NEW BIG TAXES', error)
        sendResponse(res, 500, false, 'Unable to create abig taxes')
    }
}

//UPDATE BIG TAXES
export async function updateBigTaxes(req, res) {
    const { taxId, stationName, price, from, to, miles, time, fromDescription, toDescription } = req.body
    if(!taxId){
        return sendResponse(res, 400, false, 'Tax ID is required')
    }
    if(price){
        if(isNaN(price)){
            return sendResponse(res, 400, false, 'Price must be a number')
        }
    }
    if(miles){
        if(isNaN(miles)){
            return sendResponse(res, 400, false, 'Miles must be a number')
        }
    }
    try {
        const getBigTax = await BigTaxesModel.findById({ _id: taxId })
        if(!getBigTax){
            return sendResponse(res, 404, false, 'Big tax with this Id does not exist')
        }

        if(stationName) getBigTax.stationName = stationName
        if(price) getBigTax.price = price
        if(from) getBigTax.from = from
        if(to) getBigTax.to = to
        if(miles) getBigTax.miles = miles
        if(time) getBigTax.time = time
        if(fromDescription) getBigTax.fromDescription = fromDescription
        if(toDescription) getBigTax.toDescription = toDescription

        await getBigTax.save()

        sendResponse(res, 200, true, 'Big tax updated successful')
    } catch (error) {
        console.log('UANBLE TO UPDATE BIG TAXES', error)
        sendResponse(res, 500, false, 'Unable to update big taxes')
    }
}

//DELETE BIG TAXES
export async function deleteBigTaxes(req, res) {
    const { taxId } = req.body
    if(!taxId){
        return sendResponse(res, 400, false, 'Tax ID is required')
    }
    try {
        const getBigTax = await BigTaxesModel.findById({ _id: taxId })
        if(!getBigTax){
            return sendResponse(res, 404, false, 'Big tax with this Id does not exist')
        }
        const deleteTax = await BigTaxesModel.findByIdAndDelete({ _id: taxId })

        sendResponse(res, 200, true, 'Big Taxes data deleted successful')
    } catch (error) {
        console.log('UNABLE TO DELETE BIG TAXES', error)
        sendResponse(res, 500, false, 'Unable to delete big taxes')
    }
}

//GET ALL BIG TAXES
export async function getAllBigTaxes(req, res) {
    const { page = 1, limit = 10 } = req.query
    try {
        const query = {}
        // Convert limit and page to numbers
        const pageNumber = Number(page);
        const limitNumber = Number(limit);

        // Calculate the number of documents to skip
        const skip = (Number(page) - 1) * Number(limit);
  
        // Fetch taxes from the database
        const taxes = await BigTaxesModel.find(query)
        .sort({ createdAt: -1 }) // Sort by latest taxes
        .skip(skip)
        .limit(limitNumber);

        // Get the total count of taxes for pagination metadata
        const totalTaxes = await BigTaxesModel.countDocuments(query);

        return sendResponse(res, 200, true, "Big taxes fetched successfully", {
            taxes: taxes,
            totalTaxes,
            totalPages: Math.ceil(totalTaxes / limitNumber),
            currentPage: pageNumber,
        });
    } catch (error) {
        console.log('UNABLE TO GET BIG TAXES', error)
        sendResponse(res, 500, false, 'Unable to get big taxes')
    }
}

//GET A BIG TAXES
export async function getABigTax(req, res) {
    const { taxId } = req.params
    if(!taxId){
        return sendResponse(res, 400, false, 'Tax ID is required')
    }
    try {
        const getBigTax = await BigTaxesModel.findById({ _id: taxId })
        if(!getBigTax){
            return sendResponse(res, 404, false, 'Big tax with this Id does not exist')
        }

        sendResponse(res, 200, true, getBigTax)
    } catch (error) {
        console.log('UNABLE TO GET BIG TAX DATA', error)
        sendResponse(res, 500, false, 'Unable to get big tax')
    }
}