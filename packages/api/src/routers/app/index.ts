import { feedbackRouter } from "./feedback";
import { jobRouter } from "./job";
import { likeRouter } from "./like";
import { postRouter } from "./post";
import { appUserRouter } from "./user";

export const appRouter = {
  feedback: feedbackRouter,
  job: jobRouter,
  post: postRouter,
  like: likeRouter,
  user: appUserRouter,
};
