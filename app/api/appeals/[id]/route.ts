import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Ожидаем params
    const { id } = await params;

    const appeal = await prisma.appeal.findUnique({
      where: { id },
      include: {
        department: true,
        executor: true,
      },
    });

    if (!appeal) {
      return NextResponse.json(
        { error: "Обращение не найдено" },
        { status: 404 }
      );
    }

    return NextResponse.json(appeal);
  } catch (error) {
    console.error("[APPEAL_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}