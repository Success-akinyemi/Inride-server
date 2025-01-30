import { sendResponse, uploadFile } from "../middlewares/utils.js";
import CarDetailModel from "../model/CarDetails.js";

//ADD NEW CARS
export async function newCar(req, res) {
  const { registrationNumber, year, model, color, noOfSeats } = req.body;
  const { driverId } = req.user;
  const { carImg } = req.files || {};

  // Validate required fields
  if (!registrationNumber || !year || !model || !color || !noOfSeats) {
      return sendResponse(res, 400, false, 'Car registration number, year, model, color, and number of seats are required');
  }

  // Validate image format
  if (carImg) {
      const allowedImageTypes = ['image/jpeg', 'image/png'];
      if (!allowedImageTypes.includes(carImg[0].mimetype)) {
          return sendResponse(res, 400, false, 'Invalid image format for car image. Accepted formats: jpeg, png');
      }
  }

  try {
      let carImgUrl = '';
      if (carImg) {
          carImgUrl = await uploadFile(carImg[0], 'driver-car-image');
      }

      // Check if the driver already has a car document
      let findCars = await CarDetailModel.findOne({ driverId });

      if (findCars) {
          // Check for duplicate registration number
          const isDuplicate = findCars.cars.some(car => car.registrationNumber === registrationNumber);
          if (isDuplicate) {
              return sendResponse(res, 400, false, 'Car with this registration number already exists');
          }

          // Add new car to existing cars array
          findCars.cars.push({
              registrationNumber,
              year,
              model,
              color,
              noOfSeats,
              carImgUrl,
          });
          await findCars.save();
      } else {
          // Create a new car document for the driver
          findCars = await CarDetailModel.create({
              driverId,
              cars: [
                  {
                      registrationNumber,
                      year,
                      model,
                      color,
                      noOfSeats,
                      carImgUrl,
                  },
              ],
          });
      }

      return sendResponse(res, 200, true, 'Car saved successfully', findCars);
  } catch (error) {
      console.error('UNABLE TO SAVE CAR:', error);
      return sendResponse(res, 500, false, 'Unable to save car');
  }
}

    //UPDATE CAR DETAILS
    export async function updateCarDetails(req, res) {
      const { driverId } = req.user;
      const { carId, registrationNumber, year, model, color, noOfSeats } = req.body;
      const { carImg } = req.files | {};
  
      // Validate image format
      if (carImg) {
          const allowedImageTypes = ['image/jpeg', 'image/png'];
          if (!allowedImageTypes.includes(carImg[0].mimetype)) {
              return sendResponse(res, 400, false, 'Invalid image format for car image. Accepted formats: jpeg, png');
          }
      }
  
      try {
          // Fetch car details by driverId
          const getCarDetails = await CarDetailModel.findOne({ driverId });
          if (!getCarDetails) {
              return sendResponse(res, 404, false, 'Car details not found');
          }
  
          // Find the car by carId
          const carIdDetails = getCarDetails.cars.find(car => car._id.toString() === carId);
          if (!carIdDetails) {
              return sendResponse(res, 404, false, 'Car not found');
          }
  
          // Upload image if provided
          let carImgUrl = '';
          if (carImg) {
              carImgUrl = await uploadFile(carImg[0], 'driver-car-image');
          }
  
          // Update car details
          if (registrationNumber) carIdDetails.registrationNumber = registrationNumber;
          if (year) carIdDetails.year = year;
          if (model) carIdDetails.model = model;
          if (color) carIdDetails.color = color;
          if (noOfSeats) carIdDetails.noOfSeats = noOfSeats;
          if (carImgUrl) carIdDetails.carImgUrl = carImgUrl;
  
          // Save updated document
          await getCarDetails.save();
  
          return sendResponse(res, 200, true, 'Car details updated successfully');
      } catch (error) {
          console.error('ERROR UPDATING CAR DETAILS (DriverId: ' + driverId + ', CarId: ' + carId + '):', error);
          return sendResponse(res, 500, false, 'Unable to update car details');
      }
  }  

//ACTIVATE CARS
export async function activateCar(req, res) {
    const { _id } = req.body;  // Car's unique ID (or registration number, etc.)
    const { driverId } = req.user;  // Driver's ID from user info
  
    try {
      // Find the driver's car details
      const findCars = await CarDetailModel.findOne({ driverId });
  
      // Check if the driver has any cars
      if (!findCars) {
        return sendResponse(res, 404, false, 'Cars not found for this driver');
      }
  
      // Find the car that needs to be activated
      const carToActivate = findCars.cars.find(car => car._id.toString() === _id);
  
      // Check if the car exists
      if (!carToActivate) {
        return sendResponse(res, 404, false, 'Car not found');
      }
  
      // Deactivate any currently active car
      findCars.cars.forEach(car => {
        if (car.active) {
          car.active = false;  // Deactivate the currently active car
        }
      });
  
      // Activate the selected car
      carToActivate.active = true;
  
      // Save the updated car details
      await findCars.save();
  
      return sendResponse(res, 200, true, 'Car activated successfully');
    } catch (error) {
      console.log('UNABLE TO MAKE CAR ACTIVE', error);
      return sendResponse(res, 500, false, 'Unable to make car active');
    }
  }

//DELETE CAR DETAILS
export async function deleteCarDetails(req, res) {
  const { driverId } = req.user;
  const { carId } = req.body;

  try {
      // Fetch car details based on driverId
      const getCarDetails = await CarDetailModel.findOne({ driverId });

      if (!getCarDetails) {
          sendResponse(res, 404, false, 'Car details not found');
          return;
      }

      // Filter out the car with the specified carId
      const carDetails = getCarDetails.cars.filter(car => car._id.toString() !== carId);

      if (carDetails.length === getCarDetails.cars.length) {
          sendResponse(res, 404, false, 'Car not found');
          return;
      }

      // Update the cars array and save the document
      getCarDetails.cars = carDetails;
      await getCarDetails.save();

      sendResponse(res, 200, true, 'Car details deleted successfully');
  } catch (error) {
      console.error('ERROR DELETING CAR DETAILS:', error);
      sendResponse(res, 500, false, 'Unable to delete car details');
  }
}

//GET CARS
export async function getCarDetails(req, res) {
  const { driverId } = req.user
  try {
      const getCarDetails = await CarDetailModel.findOne({driverId})
      if(!getCarDetails){
          sendResponse(res, 404, false, 'Car details not found')
          return
      }
      sendResponse(res, 200, true, 'Car details fetched successfully', getCarDetails)
  } catch (error) {
      console.log('ERROR FETCHING CAR DETAILS', error)
      sendResponse(res, 500, false, 'Unable to fetch car details')
  }
}

//GET SPECIFIC CAR DEATILS
export async function getCarDetail(req, res) {
  const { driverId } = req.user
  const { carId } = req.params
  try {
      const getCarDetails = await CarDetailModel.findOne({driverId})
      if(!getCarDetails){
          sendResponse(res, 404, false, 'Car details not found')
          return
      }
      const carDetail = getCarDetails.cars.find(car => car._id === carId)
      if(!carDetail){
          sendResponse(res, 404, false, 'Car details not found')
          return
      }
      sendResponse(res, 200, true, 'Car details fetched successfully', carDetail)
  } catch (error) {
      console.log('ERROR FETCHING CAR DETAILS', error)
      sendResponse(res, 500, false, 'Unable to fetch car details')
  }   
}