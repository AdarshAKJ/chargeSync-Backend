import { ValidationError } from "joi";
import { CustomError } from "../../helpers/custome.error";
import { StatusCodes } from "http-status-codes";
import { responseGenerators } from "../../lib/utils";
import ChargingStationModel from "../../models/chargingStations";
import { checkClientIdAccess } from "../../middleware/checkClientIdAccess";
import { setPagination } from "../../commons/common-functions";

export const listChargerStationHandler = async (req, res) => {
  try {
    let where = {
      isDeleted: false,
      clientId: req.session.clientId || req.query.clientId,
    };

    checkClientIdAccess(req.session, where.clientId);

    const pagination = setPagination(req.query);

    const stations = await ChargingStationModel.find(where)
      .sort(pagination.sort)
      .skip(pagination.offset)
      .limit(pagination.limit)
      .lean()
      .exec();
    // search name add

    if (!stations) throw new CustomError(`No Station found.`);
    let total_count = stations.length;

    return res.status(StatusCodes.OK).send(
      responseGenerators(
        {
          paginatedData: stations,
          totalCount: total_count,
          itemsPerPage: pagination.limit,
        },
        StatusCodes.OK,
        "SUCCESS",
        0
      )
    );
  } catch (error) {
    if (error instanceof ValidationError || error instanceof CustomError) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .send(
          responseGenerators({}, StatusCodes.BAD_REQUEST, error.message, 1)
        );
    }
    console.log(JSON.stringify(error));
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(
        responseGenerators(
          {},
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Internal Server Error",
          1
        )
      );
  }
};

export const singleChargerStationHandler = async (req, res) => {
  try {
    const { id: ChargerStationId } = req.params;
    let clientId = req.session.clientId || req.query.clientId;
    checkClientIdAccess(req.session, clientId);

    const ChargerStation = await ChargingStationModel.findOne({
      _id: ChargerStationId,
      clientId: clientId,
      isDeleted: false,
    });

    if (!ChargerStation) throw new CustomError(`No such Charger found.`);

    return res
      .status(StatusCodes.OK)
      .send(
        responseGenerators(
          { ChargerStationDetails: ChargerStation.toJSON() },
          StatusCodes.OK,
          "SUCCESS",
          0
        )
      );
  } catch (error) {
    if (error instanceof ValidationError || error instanceof CustomError) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .send(
          responseGenerators({}, StatusCodes.BAD_REQUEST, error.message, 1)
        );
    }
    console.log(JSON.stringify(error));
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(
        responseGenerators(
          {},
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Internal Server Error",
          1
        )
      );
  }
};

export const getChargerStationCountHandler = async (req, res) => {
  try {
    let where = {
      isDeleted: false,
      clientId: req.session.clientId || req.query.clientId,
    };

    checkClientIdAccess(req.session, where.clientId);

    let total_count = await ChargingStationModel.count(where);

    if (!total_count) throw new CustomError(`No Station found.`);

    return res
      .status(StatusCodes.OK)
      .send(
        responseGenerators(
          { totalStationCount: total_count },
          StatusCodes.OK,
          "SUCCESS",
          0
        )
      );
  } catch (error) {
    if (error instanceof ValidationError || error instanceof CustomError) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .send(
          responseGenerators({}, StatusCodes.BAD_REQUEST, error.message, 1)
        );
    }
    console.log(JSON.stringify(error));
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(
        responseGenerators(
          {},
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Internal Server Error",
          1
        )
      );
  }
};
