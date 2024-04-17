/* Create a webhook with which we'll listen for events coming from Stripe */

import prisma from "@/app/lib/db";
import { stripe } from "@/app/lib/stripe";
import { error } from "console";
import { sign } from "crypto";
import { headers } from "next/headers";
import Stripe from "stripe";

// post API route since we want to post data to our database

export async function POST(req: Request) {
  const body = await req.text();

  const signature = headers().get("Stripe-Signature") as string;

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    )
  } catch (error: unknown) {
    return new Response("webhook error", { status: 400 })
  }

  const session = event.data.object as Stripe.Checkout.Session;

  /* 
    - We check when the stripe checkout is completed.
    - When it is completed, we retrieve the stripe subscription and the customerId.
    - We then match the customerId on Stripe with the stripeCustomerId on our database.
    - If no user is found in our database, then we throw an error - we create a new subscription in our prismadb in the subscriptions table with information we have retrieved from Stripe.
   */
  if (event.type === "checkout.session.completed") {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    const customerId = String(session.customer)

    const user = await prisma.user.findUnique({
      where: {
        stripeCustomerId: customerId,
      },
    });

    if (!user) throw new Error("user not found...");

    await prisma.subscription.create({
      data: {
        stripeSubscriptionId: subscription.id,
        userId: user.id,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        status: subscription.status,
        planId: subscription.items.data[0].plan.id,
        interval: String(subscription.items.data[0].plan.interval)
      },
    });
  }

  /* 
    - We check if the invoice payment has succeeded.
    - If yes, we retrieve the subscription from Stripe.
    - We then update the prima db subscrption table with the data
    - If it has been uploaded onto prisma, we return 200
   */
  if (event.type === "invoice.payment_succeeded") {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    await prisma.subscription.update({
      where: {
        stripeSubscriptionId: subscription.id,
      },
      data: {
        planId: subscription.items.data[0].plan.id,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        status: subscription.status,
      },
    });
  }

  return new Response(null, { status: 200 })
}