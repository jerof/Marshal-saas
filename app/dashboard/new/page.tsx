import prisma from "@/app/lib/db";
import SubmitButton from "@/components/SubmitButtons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

export default async function NewNoteRoute() {
  noStore();
  const {getUser} = getKindeServerSession()
  const user = await getUser();

  if (!user) throw new Error("Not authorized")

  async function postData(formData: FormData) {
    "use server"
    const title = formData.get('title') as string
    const description = formData.get('description') as string

    await prisma.note.create({
      data: {
        userId: user?.id,
        title: title,
        description: description,
      },
    });

    return redirect("/dashboard")

  }

  return (
    <Card>
      <form action={postData}>
        <CardHeader>
          <CardTitle>
            New Note
          </CardTitle>
          <CardDescription>
            You can now create your new notes here.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-y-5">
          <div className="gap-y-2 flex flex-col">
            <Label>Title</Label>
            <Input required type="text" name="title" placeholder="Title for your note" />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label>Description</Label>
            <Textarea name="description" placeholder="Describe your note as you want" required />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button asChild variant="destructive">
            <Link href="/dashboard">Cancel</Link>
          </Button>
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  )
} 