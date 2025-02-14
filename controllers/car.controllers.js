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
              active: false
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
  
          if(!carIdDetails.approved){
            return sendResponse(res, 403, false, 'This car has been Deactivated by admin')
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

      if(!carToActivate.approved){
        return sendResponse(res, 403, false, 'This car has been Deactivated by admin')
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
  const { driverId: userId } = req.user
  const { driverId: queryId } = req.params

  let driverId = userId ? userId : queryId

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
  const { driverId: userId } = req.user
  const { carId, driverId: ownerId } = req.params

  let driverId = userId ? userId : ownerId
  try {
      const getCarDetails = await CarDetailModel.findOne({driverId})
      if(!getCarDetails){
          sendResponse(res, 404, false, 'Car details not found')
          return
        }
      const carDetail = getCarDetails.cars.find(car => car._id.toString() === carId)
      if(!carDetail){
          sendResponse(res, 404, false, 'Car detail not found')
          return
      }

      sendResponse(res, 200, true, carDetail, 'Car details fetched successfully')
  } catch (error) {
      console.log('ERROR FETCHING CAR DETAILS', error)
      sendResponse(res, 500, false, 'Unable to fetch car details')
  }   
}

//ADMIN
//GET ALL CARS
export async function getAllCar(req, res) {
    const { limit = 10, page = 1, active, approved } = req.query;
  
    try {
      // Fetch all car details
      const carDetails = await CarDetailModel.find();
  
      let allCars = [];
  
      carDetails.forEach((detail) => {
        detail.cars.forEach((car) => {
          // Apply active filter if explicitly provided
          if (active !== undefined && car.active !== (active === "true")) {
            return; // Skip this car
          }
  
          // Apply approved filter if explicitly provided
          if (approved !== undefined && car.approved !== (approved === "true")) {
            return; // Skip this car
          }
  
          // Add each car as a separate object with driverId
          allCars.push({
            driverId: detail.driverId,
            car: car.toObject(), // Convert Mongoose object to plain JavaScript object
          });
        });
      });
  
      // Pagination logic
      const startIndex = (Number(page) - 1) * Number(limit);
      const paginatedCars = allCars.slice(startIndex, startIndex + Number(limit));
  
      sendResponse(res, 200, true, "Cars fetched successfully", {
        cars: paginatedCars,
        totalCars: allCars.length,
        totalPages: Math.ceil(allCars.length / limit),
        currentPage: Number(page),
      });
    } catch (error) {
      console.error("UNABLE TO GET ALL CARS", error);
      sendResponse(res, 500, false, "Unable to get all cars");
    }
  }
  
//BLOCK CAR
export async function blockCar(req, res) {
    const { _id, driverId } = req.body;  // Car's unique ID
  
    try {
      // Find the driver's car details
      const findCars = await CarDetailModel.findOne({ driverId });
  
      // Check if the driver has any cars
      if (!findCars) {
        return sendResponse(res, 404, false, 'Cars not found for this driver');
      }
  
      // Find the car that needs to be blocked
      const carToActivate = findCars.cars.find(car => car._id.toString() === _id);
  
      // Check if the car exists
      if (!carToActivate) {
        return sendResponse(res, 404, false, 'Car not found');
      }
  
      // Block the selected car
      carToActivate.approved = false;
  
      // Save the updated car details
      await findCars.save();
  
      return sendResponse(res, 200, true, 'Car blocked successfully');
    } catch (error) {
      console.log('UNABLE TO BLOCK CAR', error);
      return sendResponse(res, 500, false, 'Unable to block car');
    }
  }

//UNBLOCK CAR
export async function unBlockCar(req, res) {
    const { _id, driverId } = req.body;  // Car's unique ID
  
    try {
      // Find the driver's car details
      const findCars = await CarDetailModel.findOne({ driverId });
  
      // Check if the driver has any cars
      if (!findCars) {
        return sendResponse(res, 404, false, 'Cars not found for this driver');
      }
  
      // Find the car that needs to be unblocked
      const carToActivate = findCars.cars.find(car => car._id.toString() === _id);
  
      // Check if the car exists
      if (!carToActivate) {
        return sendResponse(res, 404, false, 'Car not found');
      }
  
      // Unblock the selected car
      carToActivate.approved = true;
  
      // Save the updated car details
      await findCars.save();
  
      return sendResponse(res, 200, true, 'Car unblock successfully');
    } catch (error) {
      console.log('UNABLE TO UNBLOCK CAR', error);
      return sendResponse(res, 500, false, 'Unable to unblock car');
    }
  }

//GET CAR STATS ALL RENTAL CARS ALL PERSONAL CARS COMPARE TO LAST MONTH
export async function carStats(req, res) {
    const { stats = '30days' } = req.params;

    const getFilterDates = (value) => {
        const today = new Date();
        let startDate, endDate, previousStartDate, previousEndDate;

        switch (value) {
            case 'today':
                endDate = new Date(today);
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - 1);
                previousEndDate = new Date(startDate);
                previousStartDate = new Date(previousEndDate);
                previousStartDate.setDate(previousStartDate.getDate() - 1);
                break;

            case '7days':
                endDate = new Date(today);
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - 7);
                previousEndDate = new Date(startDate);
                previousStartDate = new Date(previousEndDate);
                previousStartDate.setDate(previousStartDate.getDate() - 7);
                break;

            case '30days':
                endDate = new Date(today);
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - 30);
                previousEndDate = new Date(startDate);
                previousStartDate = new Date(previousEndDate);
                previousStartDate.setDate(previousStartDate.getDate() - 30);
                break;

            case '1year':
                endDate = new Date(today);
                startDate = new Date(today);
                startDate.setFullYear(startDate.getFullYear() - 1);
                previousEndDate = new Date(startDate);
                previousStartDate = new Date(previousEndDate);
                previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);
                break;

            case 'alltime':
                startDate = new Date(0); // Unix epoch start
                endDate = new Date();
                previousStartDate = null;
                previousEndDate = null;
                break;

            default:
                throw new Error('Invalid stats value');
        }

        return { startDate, endDate, previousStartDate, previousEndDate };
    };

    const calculatePercentageChange = (current, previous) => {
        if (previous === 0) return { change: 100, percentage: '+' }; // Handle division by zero
        const change = ((current - previous) / previous) * 100;
        return {
            change: parseFloat(change.toFixed(2)),
            percentage: change >= 0 ? '+' : '-',
        };
    };

    try {
        const { startDate, endDate, previousStartDate, previousEndDate } = getFilterDates(stats);

        // Aggregation pipeline with `$unwind` to extract individual cars
        const aggregateCars = async (start, end) => {
            return await CarDetailModel.aggregate([
                { $unwind: "$cars" }, // Flatten the cars array
                { $match: { "cars.createdAt": { $gte: start, $lte: end } } },
                {
                    $group: {
                        _id: "$cars.method",
                        totalCars: { $sum: 1 },
                    },
                },
            ]);
        };

        const currentCarData = await aggregateCars(startDate, endDate);
        let previousCarData = [];
        if (previousStartDate && previousEndDate) {
            previousCarData = await aggregateCars(previousStartDate, previousEndDate);
        }

        const getCarCount = (data, method) => {
            const entry = data.find(item => item._id === method);
            return entry ? entry.totalCars : 0;
        };

        const currentPersonalCarCount = getCarCount(currentCarData, 'Personal');
        const previousPersonalCarCount = getCarCount(previousCarData, 'Personal');
        const currentRentalCarCount = getCarCount(currentCarData, 'Rental');
        const previousRentalCarCount = getCarCount(previousCarData, 'Rental');

        const statsComparison = [
            {
                current: currentPersonalCarCount,
                previous: previousPersonalCarCount,
                id: 'totalpersonnalcar',
                name: 'Personal cars',
                ...calculatePercentageChange(currentPersonalCarCount, previousPersonalCarCount),
            },
            {
                current: currentRentalCarCount,
                previous: previousRentalCarCount,
                id: 'totalrentalcar',
                name: 'Rental cars',
                ...calculatePercentageChange(currentRentalCarCount, previousRentalCarCount),
            },
        ];

        sendResponse(res, 200, true, statsComparison);
    } catch (error) {
        console.error('UNABLE TO GET CAR STATS', error);
        sendResponse(res, 500, false, 'Unable to get cars stats');
    }
}
