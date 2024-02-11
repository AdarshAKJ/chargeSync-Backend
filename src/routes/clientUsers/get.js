import { responseGenerators } from "../../lib/utils";
import clientUserModel from "../../models/clientUser";

export const listClientUser = async (req, res) => {
  try {
    const users = await clientUserModel.find({ isDeleted: false });

    if(!users) throw new CustomError(`No users found.`);

    return res
        .status(StatusCodes.OK)
        .send(
          responseGenerators(
            { ...users.toJSON() },
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


export const deleteClientUser = async (req, res) => {
  try {
    const { id: userId } = req.params;
    const user = await clientUserModel.findOne({
      _id: userId,
      isDeleted: false
    });

    if(!user) throw new CustomError(`No such user is registered with us.`);

    user.isDeleted = true;

    await user.save();

    return res
        .status(StatusCodes.OK)
        .send(
          responseGenerators(
            {},
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
}